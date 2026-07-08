'use client';

import { categoryConfig, pathogenConfig, animalIcons, type Disease } from '@/lib/diseases-data';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  X,
  Syringe,
  Pill,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface DiseaseDetailProps {
  disease: Disease;
  onClose: () => void;
}

export default function DiseaseDetail({ disease, onClose }: DiseaseDetailProps) {
  const catConfig = categoryConfig[disease.category];
  const patConfig = pathogenConfig[disease.pathogenType];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className={`p-4 ${catConfig.bgColor} border-b`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <span className="text-2xl">{patConfig.icon}</span>
            <div>
              <h2 className="text-lg font-bold leading-tight">{disease.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={`${catConfig.bgColor} ${catConfig.color} border`}>
                  {catConfig.icon} {catConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {patConfig.icon} {patConfig.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Пункт {disease.id}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Animal types */}
        <div className="flex flex-wrap gap-2 mt-3">
          {disease.animalTypes.map(a => (
            <span key={a} className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1">
              <span>{animalIcons[a] || '🐾'}</span>
              <span>{a}</span>
            </span>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Info notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              На основании Приказа Минсельхоза РФ от 09.03.2011 №62 (ред. от 25.09.2020).
              Все препараты должны применяться строго по инструкции производителя.
              Назначение проводит ветеринарный врач.
            </p>
          </div>

          {/* Specific Therapy */}
          {disease.specificTherapy.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Syringe className="h-4 w-4 text-red-600" />
                Специфическая терапия
                <Badge variant="secondary" className="text-[10px] h-5">
                  {disease.specificTherapy.length} препаратов
                </Badge>
              </h3>
              <div className="space-y-2">
                {disease.specificTherapy.map((drug, i) => (
                  <DrugCard key={i} drug={drug} type="specific" />
                ))}
              </div>
            </div>
          )}

          {/* Symptomatic Therapy */}
          {disease.symptomaticTherapy.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Pill className="h-4 w-4 text-blue-600" />
                Симптоматическая терапия
                <Badge variant="secondary" className="text-[10px] h-5">
                  {disease.symptomaticTherapy.length} препаратов
                </Badge>
              </h3>
              <div className="space-y-2">
                {disease.symptomaticTherapy.map((drug, i) => (
                  <DrugCard key={i} drug={drug} type="symptomatic" />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Footer notice */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium">Источник:</span> Приказ Минсельхоза РФ №62 от 09.03.2011 (ред. от 25.09.2020)</p>
                <p><span className="font-medium">Пункт перечня:</span> {disease.id}</p>
                <p>Данные о препаратах и дозировках взяты из зарегистрированной базы ветеринарных препаратов. Перед применением препарата необходимо ознакомиться с полной инструкцией.</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function DrugCard({ drug, type }: { drug: { name: string; inn: string; dosage: string; course: string; route: string; frequency: string }; type: 'specific' | 'symptomatic' }) {
  const borderColor = type === 'specific' ? 'border-l-red-500' : 'border-l-blue-500';
  
  return (
    <div className={`border rounded-lg p-3 bg-background border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight">{drug.name}</p>
          {drug.inn && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              <span className="font-medium">МНН:</span> {drug.inn}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
        {drug.dosage && (
          <span><span className="font-medium text-foreground">Дозировка:</span> {drug.dosage}</span>
        )}
        {drug.course && (
          <span><span className="font-medium text-foreground">Курс:</span> {drug.course}</span>
        )}
        {drug.route && (
          <span><span className="font-medium text-foreground">Путь:</span> {drug.route}</span>
        )}
        {drug.frequency && (
          <span><span className="font-medium text-foreground">Частота:</span> {drug.frequency}</span>
        )}
      </div>
    </div>
  );
}
