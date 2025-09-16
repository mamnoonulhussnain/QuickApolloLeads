import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  packageId?: string;
  tier?: string;
  credits: number;
  price: number;
  popular?: boolean;
  savings?: number;
  onSelect: (packageId?: string) => void;
  className?: string;
}

export function PricingCard({ 
  packageId, 
  tier,
  credits, 
  price, 
  popular, 
  savings,
  onSelect,
  className 
}: PricingCardProps) {
  const pricePerCredit = (price / credits * 1000).toFixed(2);
  
  return (
    <Card className={cn(
      "relative backdrop-blur-sm bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300",
      popular && "ring-2 ring-purple-400 ring-offset-2 ring-offset-transparent",
      className
    )}>
      {popular && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white">
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center">
        {tier && (
          <Badge className="mx-auto mb-2 bg-purple-500 text-white">
            {tier}
          </Badge>
        )}
        <CardTitle className="text-2xl">
          {credits.toLocaleString()} Credits
        </CardTitle>
        <div className="text-3xl font-bold">${price.toFixed(0)}</div>
        <div className="text-sm text-gray-300">
          ${pricePerCredit}/1000 leads
        </div>
        {savings && savings > 0 && (
          <Badge className="mx-auto mt-2 bg-green-500 text-white">
            {savings}% savings
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        <Button 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => onSelect(packageId)}
        >
          Get {credits.toLocaleString()} Credits
        </Button>
      </CardContent>
    </Card>
  );
}