import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'..');
function browserBoundary() {
  return {
    name:'track-and-trace-browser-boundary', enforce:'pre',
    load(id) {
      const file=id.split('?')[0].replaceAll('\\','/');
      if(file.startsWith(root.replaceAll('\\','/')+'/src/app/')&&file.endsWith('/actions.ts')) {
        const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
        const actionModule=path.relative(path.join(root,'src/app'),file).replaceAll('\\','/').replace(/\.ts$/,'');
        return 'import {invokeAction} from "@client/api";\n'+source.statements
          .filter(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))
          .map(n=>'export const '+n.name.text+'=(...args)=>invokeAction('+JSON.stringify(actionModule+':'+n.name.text)+',args);').join('\n');
      }
      if(file.endsWith('/src/lib/session.ts'))return 'export {getSessionUser,requireUser,requireAdmin,isAdmin} from "@client/api";';
      if(file.endsWith('/src/server/storage.ts'))return 'export {photoUrl} from "@client/api";';
      if(file.endsWith('/src/server/options.ts')) {
        const text=fs.readFileSync(file,'utf8'), source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
        return source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='locationLabel').getText(source);
      }
      if(file.endsWith('/src/db/schema.ts')) {
        const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
        return source.statements.filter(n=>ts.isVariableStatement(n)&&n.getText(source).startsWith('export const ')&&
          n.declarationList.declarations.every(d=>/^[A-Z_]+$/.test(d.name.getText(source)))).map(n=>n.getText(source)).join('\n');
      }
      if(file.endsWith('/src/db/index.ts')) return 'export const db=undefined; export const schema=undefined;';
      if(/\/src\/server\/(counts|queries|sql|items|profile)\.ts$/.test(file)) {
        const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
        const names=source.statements.flatMap(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)?[n.name.text]:
          ts.isVariableStatement(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)?n.declarationList.declarations.map(d=>d.name.getText(source)):[]);
        return names.map(name=>'export const '+name+'=()=>{throw new Error("A server loader was invoked in the browser")};').join('\n');
      }
      if(file.endsWith('/src/lib/auth.ts')||file.endsWith('/src/lib/env.ts')||file.endsWith('/src/db/connection.ts')||
          file.endsWith('/client-loader.generated.tsx'))throw new Error('Server-only module reached browser bundle: '+file);
    },
  };
}
export default defineConfig({
  plugins:[browserBoundary(),react(),tailwindcss(),{
    name:'api-connection-hint',
    transformIndexHtml(){
      const origin=new URL(process.env.VITE_API_BASE_URL||'https://track-and-trace-ucp.vercel.app').origin;
      return [{tag:'link',attrs:{rel:'preconnect',href:origin,crossorigin:''},injectTo:'head'}];
    },
  }],
  publicDir:path.join(import.meta.dirname,'public'),
  resolve:{
    alias:[
      {find:'next/link',replacement:path.join(import.meta.dirname,'src/link.tsx')},
      {find:'next/navigation',replacement:path.join(import.meta.dirname,'src/navigation.ts')},
      {find:'next/server',replacement:path.join(import.meta.dirname,'src/next-server.ts')},
      {find:'@client',replacement:path.join(import.meta.dirname,'src')},
      {find:'@',replacement:path.join(root,'src')},
    ],
    dedupe:['react','react-dom'],
  },
  server:{fs:{allow:[root]}},
  build:{sourcemap:false},
});
