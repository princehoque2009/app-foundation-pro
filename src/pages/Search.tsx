import { MainLayout } from "@/components/layout/MainLayout";

const Search = () => {
  return (
    <MainLayout showBottomNav={false}>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Search</h1>
        <p className="text-muted-foreground">Discover content and people</p>
      </div>
    </MainLayout>
  );
};

export default Search;
