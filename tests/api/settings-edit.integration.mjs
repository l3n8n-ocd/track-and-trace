// Local-only integration check: node tests/api/settings-edit.integration.mjs
// Start the API on localhost:3000 using the local .env.local database first.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

const api = 'http://localhost:3000';
const dbUrl = new URL(process.env.DATABASE_URL);
assert(['localhost', '127.0.0.1'].includes(dbUrl.hostname), 'This test only runs against a local database.');
const suffix = randomUUID().slice(0, 8);
const ids = { categories: [], locations: [], colleges: [], report: null, user: null };
let db;
let token;
let checks = 0;

async function action(name, id, values, authenticated = true) {
  const body = new FormData();
  body.set('$action', name);
  body.set('$args', JSON.stringify([id, { $form: true }]));
  for (const [key, value] of Object.entries(values)) body.set('$form1:' + key, String(value));
  const res = await fetch(api + '/api/client/action', {
    method: 'POST', body,
    headers: { Origin: 'http://localhost:5173', ...(authenticated && token ? { Authorization: 'Bearer ' + token } : {}) },
  });
  assert.equal(res.status, 200, 'Action must return its normal redirect response');
  return res.json();
}
async function page(id) {
  const res = await fetch(api + '/api/client/page?' + new URLSearchParams({ id, params: '{}', search: '{}' }), { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(res.status, 200);
  return (await res.json()).data;
}
async function insert(sql, values) { return (await db.execute(sql, values))[0].insertId; }
async function row(table, key, id) { return (await db.execute(`select * from ${table} where ${key}=?`, [id]))[0][0]; }
function ok(condition, message) { assert(condition, message); checks++; console.log('PASS ' + message); }

(async () => {
  db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const login = await action('(auth)/actions:loginAction', null, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }, false);
    token = login.sessionToken;
    assert(token, 'Local administrator login must succeed');
    const [admins] = await db.query("select id from user where role='admin' limit 1");
    const admin = admins[0].id;
    const root = await insert('insert into category(category_name) values(?)', ['Edit root ' + suffix]); ids.categories.push(root);
    const otherRoot = await insert('insert into category(category_name) values(?)', ['Edit second root ' + suffix]); ids.categories.push(otherRoot);
    const child = await insert('insert into category(category_name,parent_category_id) values(?,?)', ['Edit child ' + suffix, root]); ids.categories.push(child);
    const place = await insert('insert into location(building_name,area_description,is_active) values(?,?,0)', ['Edit place ' + suffix, 'Old area']); ids.locations.push(place);
    const storage = await insert('insert into location(building_name,room_number,storage_bin,is_storage) values(?,?,?,1)', ['Edit office ' + suffix, 'Old room', 'Old bin']); ids.locations.push(storage);
    const college = await insert('insert into college(college_name) values(?)', ['Edit college ' + suffix]); ids.colleges.push(college);
    ids.user = randomUUID();
    await db.execute("insert into user(id,name,email,email_verified,id_number,first_name,last_name,college_id) values(?,?,?,1,?,?,?,?)", [ids.user, 'Settings Fixture', `settings-${suffix}@example.test`, 'SET-' + suffix, 'Settings', 'Fixture', college]);
    ids.report = await insert("insert into report(user_id,category_id,location_id,storage_location_id,report_type,item_name,date_lost_or_found,status) values(?,?,?,?,'FOUND',?,curdate(),'VERIFIED')", [admin, child, place, storage, 'Settings fixture ' + suffix]);
    // Warm the shared reference caches before edits.
    await page('admin/settings');

    let res = await action('admin/actions:updateCategoryAction', child, { tab: 'categories', name: 'Updated child ' + suffix, parentId: otherRoot });
    ok(new URL(res.redirect, api).searchParams.get('msg') === 'Category updated.', 'category edit succeeds');
    let current = await row('category', 'category_id', child);
    ok(current.parent_category_id === otherRoot && current.category_name === 'Updated child ' + suffix, 'category name and parent persist');
    res = await action('admin/actions:updateCategoryAction', otherRoot, { tab: 'categories', name: 'Blocked nesting', parentId: child });
    ok(Boolean(new URL(res.redirect, api).searchParams.get('error')) && (await row('category', 'category_id', otherRoot)).parent_category_id === null, 'invalid category nesting is rejected without writing');
    res = await action('admin/actions:updateCategoryAction', child, { tab: 'categories', name: 'Edit second root ' + suffix, parentId: '' });
    ok(Boolean(new URL(res.redirect, api).searchParams.get('error')), 'duplicate category names in the same group are rejected');

    res = await action('admin/actions:updateLocationAction', place, { tab: 'places', buildingName: 'Updated place ' + suffix, areaDescription: 'New area', roomNumber: '' });
    current = await row('location', 'location_id', place);
    ok(res.redirect.includes('Place+updated') && current.area_description === 'New area' && !current.is_active && !current.is_storage, 'place edit preserves hidden status and place type');
    res = await action('admin/actions:updateLocationAction', storage, { tab: 'storage', buildingName: 'Updated office ' + suffix, roomNumber: 'Room 20', storageBin: 'Bin C', areaDescription: '' });
    current = await row('location', 'location_id', storage);
    ok(res.redirect.includes('Storage+location+updated') && current.room_number === 'Room 20' && current.storage_bin === 'Bin C' && current.is_storage && current.is_active, 'storage name, room and bin persist without changing visibility or type');

    res = await action('admin/actions:updateCollegeAction', college, { tab: 'colleges', name: 'Updated college ' + suffix });
    ok(res.redirect.includes('College+or+office+updated') && (await row('college', 'college_id', college)).college_name === 'Updated college ' + suffix, 'college/office edit persists');
    const [existing] = await db.execute('select college_name from college where college_id<>? limit 1', [college]);
    res = await action('admin/actions:updateCollegeAction', college, { tab: 'colleges', name: existing[0].college_name });
    ok(Boolean(new URL(res.redirect, api).searchParams.get('error')) && (await row('college', 'college_id', college)).college_name === 'Updated college ' + suffix, 'duplicate college/office names are rejected without changing the record');
    const report = await row('report', 'report_id', ids.report);
    ok(report.category_id === child && report.location_id === place && report.storage_location_id === storage && (await row('user', 'id', ids.user)).college_id === college, 'existing reports and profiles keep the same linked IDs');

    const fresh = await page('admin/settings');
    ok(fresh.categories.some(c => c.id === child && c.name === 'Updated child ' + suffix) && fresh.locations.some(l => l.id === storage && l.storageBin === 'Bin C') && fresh.colleges.some(c => c.id === college && c.name === 'Updated college ' + suffix), 'all reference caches immediately return the edited values');
    for (const [name, id, values] of [
      ['updateCategoryAction', child, { tab: 'categories', name: 'Unauthorized', parentId: '' }],
      ['updateLocationAction', place, { tab: 'places', buildingName: 'Unauthorized' }],
      ['updateCollegeAction', college, { tab: 'colleges', name: 'Unauthorized' }],
    ]) {
      res = await action('admin/actions:' + name, id, values, false);
      ok(res.redirect.startsWith('/login'), 'guest cannot invoke ' + name);
    }
    const { hashPassword } = await import('better-auth/crypto');
    const password = 'Fixture-' + randomUUID();
    await db.execute("insert into account(id,account_id,provider_id,user_id,password) values(?,?,'credential',?,?)", [randomUUID(), ids.user, ids.user, await hashPassword(password)]);
    const regular = await action('(auth)/actions:loginAction', null, { email: `settings-${suffix}@example.test`, password }, false);
    const adminToken = token;
    token = regular.sessionToken;
    assert(token, 'Local student login must succeed');
    for (const [name, id, values] of [
      ['updateCategoryAction', child, { tab: 'categories', name: 'Unauthorized', parentId: '' }],
      ['updateLocationAction', place, { tab: 'places', buildingName: 'Unauthorized' }],
      ['updateCollegeAction', college, { tab: 'colleges', name: 'Unauthorized' }],
    ]) {
      res = await action('admin/actions:' + name, id, values);
      ok(res.redirect === '/dashboard', 'ordinary user cannot invoke ' + name);
    }
    token = adminToken;
    ok((await row('category', 'category_id', child)).category_name === 'Updated child ' + suffix && (await row('location', 'location_id', place)).building_name === 'Updated place ' + suffix && (await row('college', 'college_id', college)).college_name === 'Updated college ' + suffix, 'unauthorized requests leave data unchanged');
    console.log(`${checks} local API integration checks passed.`);
  } finally {
    if (ids.report) await db.execute('delete from report where report_id=?', [ids.report]);
    if (ids.user) await db.execute('delete from user where id=?', [ids.user]);
    for (const [entity, table, key, values] of [['category', 'category', 'category_id', ids.categories.slice().reverse()], ['location', 'location', 'location_id', ids.locations], ['college', 'college', 'college_id', ids.colleges]]) {
      for (const id of values) {
        // Expire the same reference caches used by the browser before removing
        // local fixtures, so the next settings view cannot show deleted rows.
        if (entity === 'category') {
          await action('admin/actions:deleteCategoryAction', id, { tab: 'categories' });
        } else {
          const current = await row(table, key, id);
          if (current) {
            await action(entity === 'location' ? 'admin/actions:updateLocationAction' : 'admin/actions:updateCollegeAction', id, entity === 'location'
              ? { tab: current.is_storage ? 'storage' : 'places', buildingName: current.building_name, areaDescription: current.area_description ?? '', roomNumber: current.room_number ?? '', storageBin: current.storage_bin ?? '' }
              : { tab: 'colleges', name: current.college_name });
          }
        }
        await db.execute('delete from activity_log where target_entity=? and target_id=?', [entity, String(id)]);
        if (entity !== 'category') await db.execute(`delete from ${table} where ${key}=?`, [id]);
      }
    }
    await db.end();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
