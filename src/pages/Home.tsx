import { MainLayout } from "@/components/layout/MainLayout";
import { Stories } from "@/components/home/Stories";
import { PostCard } from "@/components/home/PostCard";

const mockPosts = [
  {
    id: 1,
    author: { name: "Alex Johnson", username: "alexj", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" },
    content: "Just launched my new project! Excited to share it with everyone. What do you all think? 🚀",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    likes: 234,
    comments: 45,
    timestamp: "2h ago",
  },
  {
    id: 2,
    author: { name: "Maria Garcia", username: "mariag", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150" },
    content: "Beautiful sunset today! Nature never disappoints. 🌅",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    likes: 567,
    comments: 89,
    timestamp: "5h ago",
  },
  {
    id: 3,
    author: { name: "David Chen", username: "dchen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150" },
    content: "Working on something exciting. Can't wait to reveal it! Stay tuned for updates.",
    likes: 123,
    comments: 23,
    timestamp: "8h ago",
  },
];

const Home = () => {
  return (
    <MainLayout>
      <div className="bg-gradient-to-b from-background to-muted/20">
        {/* Stories Section */}
        <div className="bg-card border-b border-border py-4">
          <Stories />
        </div>

        {/* Posts Feed */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          {mockPosts.map((post) => (
            <PostCard key={post.id} {...post} />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
