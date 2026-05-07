interface DoneFooterProps {
  visible: boolean;
}

export default function DoneFooter({ visible }: DoneFooterProps) {
  if (!visible) return null;

  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 to-accent-yellow/10 rounded-full">
        <span className="text-primary text-lg">✨</span>
        <span className="text-primary font-medium">今日运势已为您推演完毕</span>
        <span className="text-primary text-lg">✨</span>
      </div>
    </div>
  );
}