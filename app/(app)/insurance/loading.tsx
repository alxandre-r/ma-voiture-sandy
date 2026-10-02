import { Card } from '@/components/common/ui/card';

const BAR = 'bg-gray-200 dark:bg-gray-700 rounded animate-pulse';

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className={`h-3 w-24 ${BAR}`} />
            <div className={`h-6 w-20 ${BAR}`} />
          </Card>
        ))}
      </div>

      {/* Vehicle cards */}
      <div className="space-y-2">
        <div className={`h-4 w-32 ${BAR}`} />
        <div className="grid gap-3 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className={`h-4 w-40 ${BAR}`} />
              <div className={`h-3 w-56 ${BAR}`} />
              <div className={`h-7 w-32 ml-auto ${BAR}`} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
