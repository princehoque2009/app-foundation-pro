import { MainLayout } from "@/components/layout/MainLayout";

const Messages = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <p className="text-muted-foreground">Your conversations</p>
      </div>
    </MainLayout>
  );
};

export default Messages;
