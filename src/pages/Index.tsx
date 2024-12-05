import { RecentScans } from "@/components/RecentScans";
import { TopCategories } from "@/components/TopCategories";
import { UploadButton } from "@/components/UploadButton";

const Index = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <TopCategories />
      <UploadButton />
      <RecentScans />
    </div>
  );
};

export default Index;