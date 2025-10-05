import { MainLayout } from "@/components/layout/MainLayout";

const Home = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Home Feed</h1>
        <p className="text-muted-foreground">Welcome to Prangon - Phase 1 Foundation</p>
      </div>
    </MainLayout>
  );
};

export default Home;
