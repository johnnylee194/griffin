import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { id: 'fortune', label: '运势' },
  { id: 'betting', label: '打牌' },
  { id: 'bestAction', label: '决策' },
  { id: 'direction', label: '方位' },
  { id: 'goldenTime', label: '时段' },
  { id: 'conflictWarning', label: '警示' },
  { id: 'luckEnhancement', label: '开运' },
];

export default function AnchorNav() {
  const [activeId, setActiveId] = useState<string>('fortune');

  const handleClick = (id: string) => {
    const element = document.getElementById(`dimension-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const visibleId = visibleEntries[0].target.id.replace('dimension-', '');
          setActiveId(visibleId);
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const element = document.getElementById(`dimension-${id}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-2 border-b border-gray-100">
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
                ${activeId === item.id
                  ? 'bg-primary text-white font-bold'
                  : 'bg-gray-100 text-text-secondary hover:bg-primary/10 hover:text-primary'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}