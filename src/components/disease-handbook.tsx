'use client';

import { useState, useMemo } from 'react';
import { diseases, categoryConfig, pathogenConfig, animalIcons, type Disease, type DiseaseCategory } from '@/lib/diseases-data';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DiseaseHandbookProps {
  selectedDisease: Disease | null;
  onSelectDisease: (disease: Disease) => void;
}

export default function DiseaseHandbook({ selectedDisease, onSelectDisease }: DiseaseHandbookProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAnimal, setFilterAnimal] = useState<string>('all');

  // Get unique animal types
  const allAnimalTypes = useMemo(() => {
    const types = new Set<string>();
    diseases.forEach(d => d.animalTypes.forEach(a => types.add(a)));
    return Array.from(types).sort();
  }, []);

  // Filter diseases
  const filtered = useMemo(() => {
    return diseases.filter(d => {
      const matchesSearch = searchQuery === '' ||
        d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
      const matchesAnimal = filterAnimal === 'all' || d.animalTypes.includes(filterAnimal);
      return matchesSearch && matchesCategory && matchesAnimal;
    });
  }, [searchQuery, filterCategory, filterAnimal]);

  // Stats
  const stats = useMemo(() => {
    const categories: Record<string, number> = {};
    diseases.forEach(d => {
      categories[d.category] = (categories[d.category] || 0) + 1;
    });
    return categories;
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Справочник болезней</h2>
          <Badge variant="secondary">{diseases.length} болезней</Badge>
        </div>

        {/* Stats bar */}
        <div className="flex gap-2 mb-3">
          {Object.entries(stats).map(([cat, count]) => {
            const config = categoryConfig[cat as DiseaseCategory];
            return (
              <div key={cat} className={`text-xs px-2 py-1 rounded-md ${config.bgColor} ${config.color} flex items-center gap-1`}>
                <span>{config.icon}</span>
                <span>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск болезни..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="Особо опасная">🔴 Особо опасные</SelectItem>
              <SelectItem value="Инфекционная">🟠 Инфекционные</SelectItem>
              <SelectItem value="Инвазионная">🟣 Инвазионные</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAnimal} onValueChange={setFilterAnimal}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Вид животных" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все виды</SelectItem>
              {allAnimalTypes.map(a => (
                <SelectItem key={a} value={a}>
                  {animalIcons[a] || '🐾'} {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Disease List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Ничего не найдено
            </div>
          ) : (
            filtered.map(disease => {
              const catConfig = categoryConfig[disease.category];
              const patConfig = pathogenConfig[disease.pathogenType];
              const isSelected = selectedDisease?.id === disease.id;
              return (
                <button
                  key={disease.id}
                  onClick={() => onSelectDisease(disease)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                    isSelected
                      ? `${catConfig.bgColor} border-2 shadow-md`
                      : 'bg-card border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{patConfig.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{disease.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 ${catConfig.bgColor} ${catConfig.color}`}>
                          {catConfig.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {patConfig.icon} {patConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {disease.animalTypes.slice(0, 4).map(a => (
                          <span key={a} className="text-xs" title={a}>
                            {animalIcons[a] || '🐾'}
                          </span>
                        ))}
                        {disease.animalTypes.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{disease.animalTypes.length - 4}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {disease.specificTherapy.length + disease.symptomaticTherapy.length} препар.
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
