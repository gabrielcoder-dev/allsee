import type { NextApiRequest, NextApiResponse } from 'next';

type BillingType = 'fisica' | 'juridica';

interface ValidationRequest {
  tipo?: BillingType;
  dados?: Record<string, any>;
}

const REGEX = {
  cpf: /^\d{11}$/,
  cnpj: /^\d{14}$/,
  cep: /^\d{8}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?\d{10,14}$/,
};

function sanitizeDigits(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '');
}

function validateCPF(value: unknown) {
  const digits = sanitizeDigits(value);
  if (!REGEX.cpf.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcCheck = (weights: number[]) =>
    weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);

  const firstCheck = (calcCheck([10, 9, 8, 7, 6, 5, 4, 3, 2]) * 10) % 11;
  if (firstCheck === 10 || firstCheck === 11 ? 0 : firstCheck !== Number(digits[9])) return false;

  const secondCheck = (calcCheck([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) * 10) % 11;
  return (secondCheck === 10 || secondCheck === 11 ? 0 : secondCheck) === Number(digits[10]);
}

function validateCNPJ(value: unknown) {
  const digits = sanitizeDigits(value);
  if (!REGEX.cnpj.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (length: number) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(12);
  const secondDigit = calcDigit(13);

  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
}

function validateBillingData(tipo: BillingType, dados: Record<string, any>) {
  const errors: string[] = [];

  const requireField = (field: string, label: string) => {
    if (!dados[field]) {
      errors.push(`${label} é obrigatório.`);
    }
  };

  if (tipo === 'fisica') {
    requireField('nome', 'Nome completo');
    requireField('cpf', 'CPF');
    requireField('email', 'Email');
    requireField('telefone', 'Telefone');
    requireField('cep', 'CEP');
    requireField('endereco', 'Endereço');
    requireField('numero', 'Número');
    requireField('bairro', 'Bairro');
    requireField('cidade', 'Cidade');
    requireField('estado', 'Estado');

    if (dados.cpf && !validateCPF(dados.cpf)) {
      errors.push('CPF inválido.');
    }
  } else {
    requireField('razaoSocial', 'Razão Social');
    requireField('cnpj', 'CNPJ');
    requireField('email', 'Email');
    requireField('segmento', 'Segmento');
    requireField('telefonej', 'Telefone');
    requireField('cepJ', 'CEP');
    requireField('enderecoJ', 'Endereço');
    requireField('numeroJ', 'Número');
    requireField('bairroJ', 'Bairro');
    requireField('cidadeJ', 'Cidade');
    requireField('estadoJ', 'Estado');

    if (dados.cnpj && !validateCNPJ(dados.cnpj)) {
      errors.push('CNPJ inválido.');
    }
  }

  const emailValue = dados.email;
  if (emailValue && !REGEX.email.test(String(emailValue).toLowerCase())) {
    errors.push('Email inválido.');
  }

  const phoneField = tipo === 'fisica' ? 'telefone' : 'telefonej';
  const phoneValue = dados[phoneField];
  if (phoneValue && !REGEX.phone.test(sanitizeDigits(phoneValue))) {
    errors.push('Telefone inválido.');
  }

  const cepField = tipo === 'fisica' ? 'cep' : 'cepJ';
  const cepValue = dados[cepField];
  if (cepValue && !REGEX.cep.test(sanitizeDigits(cepValue))) {
    errors.push('CEP inválido.');
  }

  return errors;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: true } | { errors: string[]; message: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Método não permitido', errors: ['Método inválido.'] });
  }

  const { tipo, dados } = req.body as ValidationRequest;

  if (!tipo || !dados) {
    return res.status(400).json({
      message: 'Dados insuficientes para validação.',
      errors: ['Tipo de cliente ou dados ausentes.'],
    });
  }

  const errors = validateBillingData(tipo, dados);

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Existem problemas nos dados informados.',
      errors,
    });
  }

  return res.status(200).json({ ok: true });
}

