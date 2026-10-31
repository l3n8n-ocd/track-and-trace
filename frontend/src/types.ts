export type ClientPageProps = {
  params: Promise<Record<string,string>>;
  searchParams: Promise<Record<string,string|string[]|undefined>>;
  pageData?: unknown;
};
