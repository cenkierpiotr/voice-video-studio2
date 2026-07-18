// Catalog of available voices (must match backend VOICES dict keys)
export const VOICES = {
  pl_male_marek:       { gender:'male',   age:'adult', lang:'PL', label:'Marek',       flag:'🇵🇱', avatar:'👨‍💼' },
  pl_female_zofia:     { gender:'female', age:'adult', lang:'PL', label:'Zofia',       flag:'🇵🇱', avatar:'👩‍💼' },
  pl_male_andrew_multi:  { gender:'male',   age:'adult', lang:'PL', label:'Andrew (Bardzo naturalny)', flag:'🇵🇱', avatar:'🎙️' },
  pl_female_ava_multi:   { gender:'female', age:'adult', lang:'PL', label:'Ava (Bardzo naturalna)', flag:'🇵🇱', avatar:'✨' },
  pl_male_brian_multi:   { gender:'male',   age:'adult', lang:'PL', label:'Brian (Naturalny)', flag:'🇵🇱', avatar:'🗣️' },
  pl_female_emma_multi:  { gender:'female', age:'adult', lang:'PL', label:'Emma (Naturalna)', flag:'🇵🇱', avatar:'💫' },
  en_male_guy:         { gender:'male',   age:'adult', lang:'EN', label:'Guy',         flag:'🇺🇸', avatar:'🎙️' },
  en_male_andrew:      { gender:'male',   age:'adult', lang:'EN', label:'Andrew',      flag:'🇺🇸', avatar:'👨‍🏫' },
  en_male_eric:        { gender:'male',   age:'adult', lang:'EN', label:'Eric',        flag:'🇺🇸', avatar:'🧑‍💻' },
  en_male_christopher: { gender:'male',   age:'adult', lang:'EN', label:'Christopher', flag:'🇺🇸', avatar:'👨‍⚖️' },
  en_male_brian:       { gender:'male',   age:'adult', lang:'EN', label:'Brian',       flag:'🇺🇸', avatar:'🧔' },
  en_male_ryan_gb:     { gender:'male',   age:'adult', lang:'GB', label:'Ryan',        flag:'🇬🇧', avatar:'🎩' },
  en_male_thomas_gb:   { gender:'male',   age:'adult', lang:'GB', label:'Thomas',      flag:'🇬🇧', avatar:'🧐' },
  en_female_aria:      { gender:'female', age:'adult', lang:'EN', label:'Aria',        flag:'🇺🇸', avatar:'👩‍🎤' },
  en_female_jenny:     { gender:'female', age:'adult', lang:'EN', label:'Jenny',       flag:'🇺🇸', avatar:'👩‍🏫' },
  en_female_emma:      { gender:'female', age:'adult', lang:'EN', label:'Emma',        flag:'🇺🇸', avatar:'👩‍💻' },
  en_female_michelle:  { gender:'female', age:'adult', lang:'EN', label:'Michelle',    flag:'🇺🇸', avatar:'🎙️' },
  en_female_ava:       { gender:'female', age:'adult', lang:'EN', label:'Ava',         flag:'🇺🇸', avatar:'👩‍🎨' },
  en_female_sonia_gb:  { gender:'female', age:'adult', lang:'GB', label:'Sonia',       flag:'🇬🇧', avatar:'👒' },
  en_female_libby_gb:  { gender:'female', age:'adult', lang:'GB', label:'Libby',       flag:'🇬🇧', avatar:'🌸' },
  en_child_ana:        { gender:'female', age:'child', lang:'EN', label:'Ana',         flag:'🇺🇸', avatar:'👧' },
  en_child_maisie_gb:  { gender:'female', age:'child', lang:'GB', label:'Maisie',      flag:'🇬🇧', avatar:'🧒' },
  de_male_konrad:      { gender:'male',   age:'adult', lang:'DE', label:'Konrad',      flag:'🇩🇪', avatar:'👨‍🔬' },
  fr_male_henri:       { gender:'male',   age:'adult', lang:'FR', label:'Henri',       flag:'🇫🇷', avatar:'🥐' },
  es_male_alvaro:      { gender:'male',   age:'adult', lang:'ES', label:'Álvaro',      flag:'🇪🇸', avatar:'💃' },
  it_male_diego:       { gender:'male',   age:'adult', lang:'IT', label:'Diego',       flag:'🇮🇹', avatar:'🍕' },
  de_female_katja:     { gender:'female', age:'adult', lang:'DE', label:'Katja',       flag:'🇩🇪', avatar:'👩‍🔬' },
  fr_female_denise:    { gender:'female', age:'adult', lang:'FR', label:'Denise',      flag:'🇫🇷', avatar:'🌹' },
  es_female_elvira:    { gender:'female', age:'adult', lang:'ES', label:'Elvira',      flag:'🇪🇸', avatar:'💃' },
};

export const STYLES = [
  { key:'normal',    label:'Normalny',    icon:'🎙️' },
  { key:'dramatic',  label:'Dramatyczny', icon:'🎭' },
  { key:'calm',      label:'Spokojny',    icon:'🌊' },
  { key:'cheerful',  label:'Radosny',     icon:'😊' },
  { key:'newscast',  label:'Wiadomości',  icon:'📰' },
  { key:'whisper',   label:'Szept',       icon:'🤫' },
  { key:'excited',   label:'Podekscytowany', icon:'⚡' },
];

export const VIDEO_STYLES = [
  { key: 'cinematic', label: 'Kinowy (Cinematic)', prompt: 'cinematic, highly detailed, 4k, epic lighting, shallow depth of field' },
  { key: 'anime', label: 'Anime / Rysunkowy', prompt: 'anime style, vibrant colors, expressive characters, detailed background' },
  { key: 'realistic', label: 'Realistyczny', prompt: 'photorealistic, raw photo, natural lighting, sharp focus, 8k' },
  { key: '3d_render', label: 'Render 3D (Pixar/Disney)', prompt: '3d render, unreal engine 5, octane render, stylized, cute' },
  { key: 'cyberpunk', label: 'Cyberpunk / Neon', prompt: 'cyberpunk, neon lights, night city, futuristic, rainy' },
  { key: 'horror', label: 'Horror / Mroczny', prompt: 'horror, dark, foggy, mysterious, atmospheric, spooky' },
];

export const RATE_OPTIONS = [
  {val:'-30%', label:'Bardzo wolno'},
  {val:'-20%', label:'Wolno'},
  {val:'-10%', label:'Nieco wolno'},
  {val:'+0%',  label:'Normalnie'},
  {val:'+10%', label:'Nieco szybko'},
  {val:'+20%', label:'Szybko'},
  {val:'+30%', label:'Bardzo szybko'},
];

export const PITCH_OPTIONS = [
  {val:'-30Hz', label:'Bardzo niski'},
  {val:'-20Hz', label:'Niski'},
  {val:'-10Hz', label:'Nieco niski'},
  {val:'+0Hz',  label:'Normalny'},
  {val:'+10Hz', label:'Nieco wysoki'},
  {val:'+20Hz', label:'Wysoki'},
  {val:'+30Hz', label:'Bardzo wysoki'},
];

export const PROMPT_EXAMPLES = [
  'Dialog dwóch przyjaciół rozmawiających o podróży do Japonii',
  'Reklama telewizyjna odkurzacza z lektorem i narratorem',
  'Bajka dla dzieci z narratorem i postacią dziecka',
  'Debata polityczna między dwoma kandydatami',
  'Audiobook - dramatyczny monolog detektywa',
  'News radiowy z dwoma prezenterami (mężczyzna i kobieta)',
  'Rozmowa babci z wnuczkiem o wakacjach',
  'Podcast tech z trzema ekspertami',
];

export function voiceBadgeClass(gender) {
  if (gender === 'male') return 'badge-male';
  if (gender === 'female') return 'badge-female';
  return 'badge-child';
}

export function makeDefaultSegment(speakerKey = 'en_male_guy') {
  return {
    id: (crypto.randomUUID?.() || ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)).toString(16))),
    speaker_key: speakerKey,
    text: '',
    rate: '+0%',
    pitch: '+0Hz',
    volume: '+0%',
  };
}
