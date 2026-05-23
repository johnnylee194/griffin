interface SkeletonCardProps {
  title: string;
}

export default function SkeletonCard({ title }: SkeletonCardProps) {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <span className="text-xs text-text-secondary">{title}</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}