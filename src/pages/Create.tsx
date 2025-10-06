import { MainLayout } from "@/components/layout/MainLayout";
import { CreatePostForm } from "@/components/create/CreatePostForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Create = () => {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Create Content</h1>
        
        <Tabs defaultValue="post" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="reel">Reel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="post">
            <CreatePostForm />
          </TabsContent>
          
          <TabsContent value="reel">
            <CreatePostForm isReel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Create;
