import { SubmissionCardSkeleton } from "@/components/loading/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SubmissionCardSkeleton key={i} />
      ))}
    </div>
  );
}
