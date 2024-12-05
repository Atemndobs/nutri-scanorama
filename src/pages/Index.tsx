import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { RecentScans } from "@/components/RecentScans";
import { TopCategories } from "@/components/TopCategories";
import { UploadButton } from "@/components/UploadButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pb-20">
      <Header />
      <main className="container max-w-md mx-auto p-4 space-y-6 animate-fadeIn">
        <TopCategories />
        <UploadButton />
        <RecentScans />
      </main>
      <Navigation />
    </div>
  );
};

export default Index;