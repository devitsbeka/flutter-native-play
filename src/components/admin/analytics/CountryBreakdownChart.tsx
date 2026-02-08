import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  data: { country: string; count: number }[];
  activeCountry: string | null;
  onCountryClick: (country: string) => void;
}

const countryFlag = (code: string) => {
  if (!code || code === 'Unknown' || code.length !== 2) return '🌍';
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
};

export function CountryBreakdownChart({ data, activeCountry, onCountryClick }: Props) {
  const maxCount = data[0]?.count || 1;
  const top15 = data.slice(0, 15);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          ქვეყნების განაწილება
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {top15.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">მონაცემები არ არის</p>
        ) : (
          top15.map(({ country, count }) => (
            <button
              key={country}
              onClick={() => onCountryClick(country)}
              className={cn(
                "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left",
                "hover:bg-accent/50",
                activeCountry === country && "bg-primary/10 ring-1 ring-primary/30"
              )}
            >
              <span className="text-base w-7 text-center">{countryFlag(country)}</span>
              <span className="text-xs font-medium w-14 shrink-0">{country}</span>
              <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">{count}</span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}