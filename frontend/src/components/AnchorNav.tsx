interface AnchorNavProps {
  activeId?: string;
}

const NAV_ITEMS = [
  { id: 'fortune', label: '运势' },
  { id: 'betting', label: '投注' },
  { id: 'bestAction', label: '决策' },
  { id: 'direction', label: '方位' },
  { id: 'goldenTime', label: '时段' },
  { id: 'conflictWarning', label: '警示' },
  { id: 'luckEnhancement', label: '开运' },
];

export default function AnchorNav({ activeId }: AnchorNavProps) {
  const handleClick = (id: string) => {
    const element = document.getElementById(`dimension-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap
              ${activeId === item.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-primary/10 hover:text-primary'
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}