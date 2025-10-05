import { MainLayout } from "@/components/layout/MainLayout";

const Profile = () => {
  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p className="text-muted-foreground">Your profile and settings</p>
      </div>
    </MainLayout>
  );
};

export default Profile;
