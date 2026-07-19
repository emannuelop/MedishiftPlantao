// NEWS2 Early Warning Score calculation and classification module
// Based on the Royal College of Physicians (2017) protocol

export interface NEWS2ParameterOption {
  value: string;
  points: number;
  label: string;
}

export const respiratoryRateOptions: NEWS2ParameterOption[] = [
  { value: 'le8', points: 3, label: '≤ 8 irpm' },
  { value: '9-11', points: 1, label: '9–11 irpm' },
  { value: '12-20', points: 0, label: '12–20 irpm' },
  { value: '21-24', points: 2, label: '21–24 irpm' },
  { value: 'ge25', points: 3, label: '≥ 25 irpm' },
];

export const spo2ScaleOptions = [
  { value: 'scale1', label: 'Escala 1 — Geral (Sem hipercapnia/DPOC)' },
  { value: 'scale2', label: 'Escala 2 — Hipercapnia confirmada / DPOC' },
];

export const spo2Scale1Options: NEWS2ParameterOption[] = [
  { value: 's1_le91', points: 3, label: '≤ 91%' },
  { value: 's1_92-93', points: 2, label: '92–93%' },
  { value: 's1_94-95', points: 1, label: '94–95%' },
  { value: 's1_ge96', points: 0, label: '≥ 96%' },
];

export const spo2Scale2Options: NEWS2ParameterOption[] = [
  { value: 's2_le83', points: 3, label: '≤ 83%' },
  { value: 's2_84-85', points: 2, label: '84–85%' },
  { value: 's2_86-87', points: 1, label: '86–87%' },
  { value: 's2_88-92', points: 0, label: '88–92%' },
  { value: 's2_93-94_o2', points: 1, label: '93–94% (em oxigênio suplementar)' },
  { value: 's2_95-96_o2', points: 2, label: '95–96% (em oxigênio suplementar)' },
  { value: 's2_ge97_o2', points: 3, label: '≥ 97% (em oxigênio suplementar)' },
  { value: 's2_ge93_air', points: 0, label: '≥ 93% (em ar ambiente)' },
];

export const oxygenSupportOptions: NEWS2ParameterOption[] = [
  { value: 'air', points: 0, label: 'Ar ambiente (Nenhum)' },
  { value: 'supp', points: 2, label: 'Oxigênio suplementar' },
];

export const systolicBpOptions: NEWS2ParameterOption[] = [
  { value: 'le90', points: 3, label: '≤ 90 mmHg' },
  { value: '91-100', points: 2, label: '91–100 mmHg' },
  { value: '101-110', points: 1, label: '101–110 mmHg' },
  { value: '111-219', points: 0, label: '111–219 mmHg' },
  { value: 'ge220', points: 3, label: '≥ 220 mmHg' },
];

export const pulseOptions: NEWS2ParameterOption[] = [
  { value: 'le40', points: 3, label: '≤ 40 bpm' },
  { value: '41-50', points: 1, label: '41–50 bpm' },
  { value: '51-90', points: 0, label: '51–90 bpm' },
  { value: '91-110', points: 1, label: '91–110 bpm' },
  { value: '111-130', points: 2, label: '111–130 bpm' },
  { value: 'ge131', points: 3, label: '≥ 131 bpm' },
];

export const consciousnessOptions: NEWS2ParameterOption[] = [
  { value: 'alert', points: 0, label: 'Alerta' },
  { value: 'cvpu', points: 3, label: 'CVPU (Confusão nova, Voz, Dor ou Não responsivo)' },
];

export const temperatureOptions: NEWS2ParameterOption[] = [
  { value: 'le35.0', points: 3, label: '≤ 35,0 °C' },
  { value: '35.1-36.0', points: 1, label: '35,1–36,0 °C' },
  { value: '36.1-38.0', points: 0, label: '36,1–38,0 °C' },
  { value: '38.1-39.0', points: 1, label: '38,1–39,0 °C' },
  { value: 'ge39.1', points: 2, label: '≥ 39,1 °C' },
];

export interface NEWS2Assessment {
  respiratoryRate: string;
  spo2Scale: string;
  spo2: string;
  oxygenSupport: string;
  systolicBp: string;
  pulse: string;
  consciousness: string;
  temperature: string;
}

export interface NEWS2Result {
  points: {
    respiratoryRate: number;
    spo2: number;
    oxygenSupport: number;
    systolicBp: number;
    pulse: number;
    consciousness: number;
    temperature: number;
  };
  totalScore: number;
  hasRedTrigger: boolean;
  classification: {
    level: 'BAIXO' | 'BAIXO-MÉDIO' | 'MÉDIO' | 'ALTO';
    color: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    description: string;
    response: string;
  };
}

export function calculateNEWS2(assessment: NEWS2Assessment): NEWS2Result {
  const respOpt = respiratoryRateOptions.find(o => o.value === assessment.respiratoryRate);
  const oxygenOpt = oxygenSupportOptions.find(o => o.value === assessment.oxygenSupport);
  const bpOpt = systolicBpOptions.find(o => o.value === assessment.systolicBp);
  const pulseOpt = pulseOptions.find(o => o.value === assessment.pulse);
  const consciousOpt = consciousnessOptions.find(o => o.value === assessment.consciousness);
  const tempOpt = temperatureOptions.find(o => o.value === assessment.temperature);

  let spo2Opt: NEWS2ParameterOption | undefined;
  if (assessment.spo2Scale === 'scale2') {
    spo2Opt = spo2Scale2Options.find(o => o.value === assessment.spo2);
  } else {
    spo2Opt = spo2Scale1Options.find(o => o.value === assessment.spo2);
  }

  const pResp = respOpt?.points ?? 0;
  const pSpo2 = spo2Opt?.points ?? 0;
  const pOxygen = oxygenOpt?.points ?? 0;
  const pBp = bpOpt?.points ?? 0;
  const pPulse = pulseOpt?.points ?? 0;
  const pConscious = consciousOpt?.points ?? 0;
  const pTemp = tempOpt?.points ?? 0;

  const totalScore = pResp + pSpo2 + pOxygen + pBp + pPulse + pConscious + pTemp;

  // Identify red trigger: any single parameter with points = 3
  const hasRedTrigger = 
    pResp === 3 || 
    pSpo2 === 3 || 
    pOxygen === 3 || 
    pBp === 3 || 
    pPulse === 3 || 
    pConscious === 3 || 
    pTemp === 3;

  // Determine risk level based on protocol
  let level: 'BAIXO' | 'BAIXO-MÉDIO' | 'MÉDIO' | 'ALTO' = 'BAIXO';
  let color = 'emerald';
  let bgClass = 'bg-emerald-50';
  let textClass = 'text-emerald-700';
  let borderClass = 'border-emerald-200';
  let description = 'Risco Baixo';
  let response = 'O Enfermeiro Plantonista deve avaliar se é necessário ajustar o monitoramento clínico.';

  if (totalScore >= 7) {
    level = 'ALTO';
    color = 'red';
    bgClass = 'bg-red-50';
    textClass = 'text-red-700';
    borderClass = 'border-red-200';
    description = 'Risco Alto 🔴';
    response = 'Orientar o técnico nos primeiros socorros, indicar escalonamento do cuidado (internação) e solicitar transferência imediata ao Pronto Atendimento.';
  } else if (totalScore >= 5 || totalScore === 6) {
    level = 'MÉDIO';
    color = 'amber';
    bgClass = 'bg-amber-50';
    textClass = 'text-amber-700';
    borderClass = 'border-amber-200';
    description = 'Risco Intermediário 🟠';
    response = 'Solicitar consulta de intercorrência (Enfermeiro Plantonista e Médico Assistente) e reavaliação mínima a cada hora.';
  } else if (hasRedTrigger || totalScore === 3) {
    // any single parameter is 3, even if total <= 4, OR if totalScore is exactly 3
    level = 'BAIXO-MÉDIO';
    color = 'yellow';
    bgClass = 'bg-yellow-50';
    textClass = 'text-yellow-800';
    borderClass = 'border-yellow-200';
    description = 'Risco Baixo-Intermediário 🟡';
    response = 'O Enfermeiro Plantonista deve comunicar o Médico Assistente para ajuste do monitoramento clínico ou escalonamento do cuidado (internação).';
  } else {
    // 0-4 total, and no parameters with 3 points
    level = 'BAIXO';
    color = 'emerald';
    bgClass = 'bg-emerald-50';
    textClass = 'text-emerald-700';
    borderClass = 'border-emerald-200';
    description = 'Risco Baixo 🟢';
    response = 'O Enfermeiro Plantonista deve avaliar se é necessário ajustar o monitoramento clínico.';
  }

  return {
    points: {
      respiratoryRate: pResp,
      spo2: pSpo2,
      oxygenSupport: pOxygen,
      systolicBp: pBp,
      pulse: pPulse,
      consciousness: pConscious,
      temperature: pTemp,
    },
    totalScore,
    hasRedTrigger,
    classification: {
      level,
      color,
      bgClass,
      textClass,
      borderClass,
      description,
      response,
    }
  };
}

export function getOptionLabel(param: keyof NEWS2Assessment, value: string, scale?: string): string {
  switch (param) {
    case 'respiratoryRate':
      return respiratoryRateOptions.find(o => o.value === value)?.label || value;
    case 'oxygenSupport':
      return oxygenSupportOptions.find(o => o.value === value)?.label || value;
    case 'systolicBp':
      return systolicBpOptions.find(o => o.value === value)?.label || value;
    case 'pulse':
      return pulseOptions.find(o => o.value === value)?.label || value;
    case 'consciousness':
      return consciousnessOptions.find(o => o.value === value)?.label || value;
    case 'temperature':
      return temperatureOptions.find(o => o.value === value)?.label || value;
    case 'spo2Scale':
      return spo2ScaleOptions.find(o => o.value === value)?.label || value;
    case 'spo2':
      if (scale === 'scale2') {
        return spo2Scale2Options.find(o => o.value === value)?.label || value;
      }
      return spo2Scale1Options.find(o => o.value === value)?.label || value;
    default:
      return value;
  }
}
