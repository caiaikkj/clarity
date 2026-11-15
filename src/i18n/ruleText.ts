export interface RuleText {
  title: string
  explanation: string
  advice: string
}

export const INTERACTION_TEXT_PT: Record<string, RuleText> = {
  'nsaid|ssri': {
    title: 'Maior risco de sangramento',
    explanation: 'AINEs como o ibuprofeno e antidepressivos ISRS/IRSN reduzem a capacidade de coagulação do sangue. Juntos, aumentam a chance de irritação no estômago e sangramento.',
    advice: 'Converse com seu médico ou farmacêutico antes de combinar. Tome o AINE com alimentos, pelo menor tempo possível, e avise se tiver fezes escuras ou dor de estômago.',
  },
  'nsaid|snri': {
    title: 'Maior risco de sangramento',
    explanation: 'AINEs combinados com antidepressivos IRSN podem aumentar o risco de sangramento gastrointestinal.',
    advice: 'Consulte seu médico antes de usar os dois regularmente.',
  },
  'nsaid|blood_thinner': {
    title: 'Risco grave de sangramento',
    explanation: 'AINEs somam efeito aos anticoagulantes e podem irritar a mucosa do estômago, aumentando bastante o risco de sangramento.',
    advice: 'Evite, a menos que o seu médico tenha autorizado a combinação.',
  },
  'nsaid|raas': {
    title: 'Efeitos nos rins e na pressão',
    explanation: 'AINEs podem reduzir o efeito dos inibidores da ECA e dos BRAs na pressão arterial e, juntos, podem sobrecarregar os rins.',
    advice: 'Mantenha-se hidratado e converse com seu médico sobre o uso frequente de AINEs.',
  },
  'nsaid|corticosteroid': {
    title: 'Risco de úlcera no estômago',
    explanation: 'Corticoides e AINEs irritam a mucosa do estômago; juntos, aumentam a chance de úlcera e sangramento.',
    advice: 'Use apenas com orientação médica e com alimentos.',
  },
  'nsaid|alcohol': {
    title: 'Irritação do estômago',
    explanation: 'Álcool e AINEs irritam a mucosa do estômago. Beber com frequência durante o uso de AINEs aumenta o risco de sangramento.',
    advice: 'Evite álcool nos dias em que tomar AINEs.',
  },
  'nsaid|caffeine': {
    title: 'Possível desconforto no estômago',
    explanation: 'O café é ácido e pode somar à irritação gástrica que os AINEs podem causar, principalmente em jejum.',
    advice: 'Tome o AINE com alimentos, e não com café.',
  },
  'ssri|caffeine': {
    title: 'Agitação e efeitos no sono',
    explanation: 'A cafeína pode intensificar inquietação, ansiedade e alterações do sono, que algumas pessoas já sentem com ISRS.',
    advice: 'Observe como você se sente após a cafeína, principalmente à tarde.',
  },
  'serotonergic|alcohol': {
    title: 'Mais sonolência e efeitos no humor',
    explanation: 'O álcool pode intensificar a sonolência e a tontura causadas por antidepressivos e piorar sintomas de humor.',
    advice: 'Mantenha o álcool no mínimo e observe como se sente no dia seguinte.',
  },
  'ssri|st_johns_wort': {
    title: 'Risco de síndrome serotoninérgica',
    explanation: 'A erva-de-são-joão aumenta a serotonina e pode combinar de forma perigosa com ISRS, causando agitação, febre, taquicardia e tremores.',
    advice: 'Não combine sem supervisão médica.',
  },
  'serotonergic|serotonergic': {
    title: 'Risco de síndrome serotoninérgica',
    explanation: 'Usar mais de um produto que aumenta a serotonina pode elevá-la demais.',
    advice: 'Confirme com seu médico antes de combinar.',
  },
  'magnesium|vitamin_d': {
    title: 'Dupla complementar',
    explanation: 'O magnésio ajuda o corpo a converter a vitamina D em sua forma ativa, então os dois funcionam bem juntos.',
    advice: 'Nenhuma mudança necessária.',
  },
  'magnesium|caffeine': {
    title: 'Pequena perda de magnésio',
    explanation: 'A cafeína aumenta levemente a perda de magnésio pela urina. O consumo alto e frequente pode reduzir o benefício da suplementação.',
    advice: 'Modere a cafeína; a regularidade importa mais que uma xícara isolada.',
  },
  'calcium|vitamin_d': {
    title: 'Dupla complementar',
    explanation: 'A vitamina D melhora a absorção do cálcio.',
    advice: 'Nenhuma mudança necessária.',
  },
  'iron|vitamin_c': {
    title: 'Ajuda na absorção',
    explanation: 'A vitamina C melhora a absorção do ferro dos suplementos.',
    advice: 'Nenhuma mudança necessária.',
  },
  'vitamin_d|thiazide': {
    title: 'Níveis de cálcio',
    explanation: 'Diuréticos tiazídicos reduzem a perda de cálcio; com vitamina D em dose alta, isso pode elevar o cálcio no sangue.',
    advice: 'Pergunte ao médico sobre exames periódicos de cálcio.',
  },
  'vitamin_k|blood_thinner': {
    title: 'Altera o efeito do anticoagulante',
    explanation: 'A vitamina K pode neutralizar anticoagulantes do tipo varfarina, deixando as doses menos previsíveis.',
    advice: 'Mantenha o consumo de vitamina K constante e avise sua equipe de saúde.',
  },
  'omega3|blood_thinner': {
    title: 'Leve efeito somado',
    explanation: 'Ômega-3 em dose alta pode aumentar um pouco a tendência a sangramento junto com anticoagulantes.',
    advice: 'Comente com seu médico, principalmente antes de procedimentos.',
  },
  'ginkgo|blood_thinner': {
    title: 'Risco de sangramento',
    explanation: 'O ginkgo pode afetar as plaquetas e somar efeito aos anticoagulantes.',
    advice: 'Evite, a menos que o seu médico autorize.',
  },
  'melatonin|alcohol': {
    title: 'Mais sonolência',
    explanation: 'Álcool e melatonina causam sono, e o álcool prejudica a qualidade do sono.',
    advice: 'Evite álcool perto da hora de dormir.',
  },
  'melatonin|caffeine': {
    title: 'Efeitos opostos',
    explanation: 'A cafeína pode anular o efeito da melatonina e atrasar o início do sono.',
    advice: 'Evite cafeína no fim da tarde e à noite.',
  },
  'acetaminophen|alcohol': {
    title: 'Sobrecarga no fígado',
    explanation: 'O uso regular de álcool junto com paracetamol aumenta o risco de lesão no fígado.',
    advice: 'Respeite a dose máxima da bula e evite beber em excesso.',
  },
  'statin|alcohol': {
    title: 'Carga sobre o fígado',
    explanation: 'Ambos são processados pelo fígado, então o consumo elevado de álcool pode aumentar a sobrecarga.',
    advice: 'Mantenha o álcool moderado e faça os exames de fígado, se solicitados.',
  },
  'antihistamine|alcohol': {
    title: 'Mais sedação',
    explanation: 'Anti-histamínicos que causam sono, junto com álcool, provocam sonolência mais forte.',
    advice: 'Evite dirigir e limite o álcool.',
  },
  'ssri|blood_thinner': {
    title: 'Maior risco de sangramento',
    explanation: 'Os ISRS reduzem a função das plaquetas e podem somar ao risco de sangramento dos anticoagulantes.',
    advice: 'Converse com seu médico.',
  },
  'minerals|thyroid': {
    title: 'Conflito de absorção com remédio da tireoide',
    explanation: 'Cálcio, ferro e magnésio se ligam à levotiroxina no intestino e podem reduzir bastante a absorção, alterando os níveis da tireoide.',
    advice: 'Tome o remédio da tireoide em jejum e mantenha os minerais pelo menos 4 horas afastados.',
  },
  'minerals|chelated_antibiotic': {
    title: 'Menor absorção do antibiótico',
    explanation: 'Minerais se ligam a antibióticos fluoroquinolonas e tetraciclinas no intestino, e menos antibiótico chega ao sangue.',
    advice: 'Separe por pelo menos 2 horas antes ou 3 a 6 horas depois do antibiótico, conforme o produto.',
  },
  'minerals|bisphosphonate': {
    title: 'Menor absorção do bifosfonato',
    explanation: 'Minerais se ligam aos bifosfonatos e diminuem a absorção.',
    advice: 'Tome o bifosfonato primeiro, com água pura, e mantenha os minerais pelo menos 2 horas afastados.',
  },
  'calcium|iron': {
    title: 'Competição na absorção de minerais',
    explanation: 'Cálcio e ferro competem pela absorção quando tomados juntos.',
    advice: 'Tome em refeições diferentes, com pelo menos 2 horas de intervalo.',
  },
}
