// dev/src/app/(public)/info-page.tsx
import { Card, CardContent } from '@/components/ui/card';

interface InfoPageProps {
  title: string;
  description?: string;
}

export default function InfoPage({ title, description }: InfoPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-brand-lg">
        <CardContent className="p-10 text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : (
            <p className="text-muted-foreground">内容建设中，敬请期待。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

