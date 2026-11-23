import React from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Car,
  Coffee,
  Film,
  Home,
  Laptop,
  MoreHorizontal,
  ShoppingBag,
  Utensils,
  Zap,
} from 'lucide-react';
import type { CategoryId } from '../types/finance';
import { CATEGORIES } from '../lib/seedData';

interface CategoryIconProps {
  categoryId: CategoryId;
  merchantHint?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryId,
  merchantHint = '',
  size = 'md',
}) => {
  const cfg = CATEGORIES[categoryId] ?? CATEGORIES.others;
  const lower = merchantHint.toLowerCase();

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-[18px] h-[18px]';
  const boxSize =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
      ? 'w-11 h-11 rounded-2xl'
      : 'w-10 h-10 rounded-xl';

  const renderGlyph = () => {
    if (lower.includes('coffee') || lower.includes('cafe')) {
      return <Coffee className={iconSize} strokeWidth={2} />;
    }
    if (lower.includes('apple') || lower.includes('bistro') || lower.includes('mac')) {
      if (categoryId === 'shopping') {
        return <Laptop className={iconSize} strokeWidth={2} />;
      }
    }
    if (lower.includes('power') || lower.includes('electric') || lower.includes('bescom')) {
      return <Zap className={iconSize} strokeWidth={2} />;
    }

    switch (categoryId) {
      case 'housing':
        return <Home className={iconSize} strokeWidth={2} />;
      case 'dining':
        return <Utensils className={iconSize} strokeWidth={2} />;
      case 'shopping':
        return <ShoppingBag className={iconSize} strokeWidth={2} />;
      case 'transport':
        return <Car className={iconSize} strokeWidth={2} />;
      case 'entertainment':
        return <Film className={iconSize} strokeWidth={2} />;
      case 'salary':
        return <Banknote className={iconSize} strokeWidth={2} />;
      case 'freelance':
        return <Briefcase className={iconSize} strokeWidth={2} />;
      case 'transfer':
        return <ArrowLeftRight className={iconSize} strokeWidth={2} />;
      default:
        return <MoreHorizontal className={iconSize} strokeWidth={2} />;
    }
  };

  return (
    <div
      className={`${boxSize} ${cfg.bgTint} ${cfg.darkBgTint} flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {renderGlyph()}
    </div>
  );
};
