import * as z from 'zod';
import { WorkShift, PatientComplexity } from '../types';

export const handoverSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente'),
  handoverDate: z.string().min(1, 'Selecione a data'),
  shift: z.nativeEnum(WorkShift),
  hadEvacuation: z.boolean(),
  tookSOSMedication: z.boolean(),
  sosMedicationName: z.string().optional(),
  hadComplication: z.boolean(),
  complicationDescription: z.string().optional(),
  hadDiurese: z.boolean(),
  observations: z.string().min(3, 'Escreva uma observação válida'),
  professionalId: z.string().min(1, 'Selecione o profissional'),
  professionalName: z.string().min(1, 'Selecione o profissional'),
  ventilation: z.string().min(1, 'Selecione o tipo de ventilação'),
  precautions: z.string().min(1, 'Selecione o tipo de precaução'),
  news2_respiratoryRate: z.string().optional(),
  news2_spo2Scale: z.string().optional(),
  news2_spo2: z.string().optional(),
  news2_oxygenSupport: z.string().optional(),
  news2_systolicBp: z.string().optional(),
  news2_pulse: z.string().optional(),
  news2_consciousness: z.string().optional(),
  news2_temperature: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tookSOSMedication && (!data.sosMedicationName || data.sosMedicationName.trim().length < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o nome da medicação SOS",
      path: ["sosMedicationName"],
    });
  }
  if (data.hadComplication && (!data.complicationDescription || data.complicationDescription.trim().length < 5)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Descreva a intercorrência (mín. 5 caracteres)",
      path: ["complicationDescription"],
    });
  }
});

export type HandoverFormData = z.infer<typeof handoverSchema>;

export const patientSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  birthDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Data inválida'),
  active: z.boolean(),
  complexity: z.nativeEnum(PatientComplexity),
  usesDevice: z.boolean(),
  deviceTypes: z.array(z.string()).optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;
