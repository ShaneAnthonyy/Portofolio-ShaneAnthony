export const profile = {
  name: 'Shane Anthony',
  role: 'Computer Science Student — Aspiring Frontend Developer',
  location: 'Tangerang, Indonesia',
  cvUrl: '/Shane-Anthony-CV.pdf',
}

export const stats = [
  { label: 'Projects', value: '6' },
  { label: 'Skills', value: '16' },
  { label: 'GPA / 4.00', value: '3.48' },
]

export const about = {
  summary: `Computer Science student interested in Frontend Development and building clean, responsive, and user-friendly websites. Has a solid foundation in HTML, CSS, JavaScript, and web development gained through academic projects and self-directed learning. Open to real-world work experience to sharpen technical skills and contribute to a development team as a Frontend Developer Intern.`,
  education: [
    {
      period: 'Sept 2024 — Present',
      school: 'Bina Nusantara University, Tangerang',
      detail: 'Computer Science',
      note: 'GPA 3.48 / 4.00',
    },
    {
      period: 'July 2021 — July 2024',
      school: 'SMAN Anglo Lippo Cikarang, Bekasi',
      detail: 'Natural Science',
      note: 'Final Score 84 / 100',
    },
  ],
  languages: [
    { name: 'Indonesian', level: 'Native' },
    { name: 'English', level: 'Advanced' },
  ],
}

export const skillGroups = [
  {
    label: 'Languages & Web',
    items: [
      { name: 'HTML', tier: 'intermediate' },
      { name: 'CSS', tier: 'intermediate' },
      { name: 'JavaScript', tier: 'intermediate' },
      { name: 'Python', tier: 'intermediate' },
      { name: 'C', tier: 'intermediate' },
      { name: 'PHP', tier: 'amateur' },
      { name: 'Java', tier: 'amateur' },
    ],
  },
  {
    label: 'Tools & Frameworks',
    items: [
      { name: 'React', tier: 'intermediate' },
      { name: 'Visual Studio Code', tier: 'intermediate' },
      { name: 'Figma', tier: 'intermediate' },
      { name: 'GitHub', tier: 'amateur' },
      { name: 'Laravel', tier: 'amateur' },
      { name: 'MySQL', tier: 'amateur' },
      { name: 'Vite', tier: 'amateur' },
    ],
  },
  {
    label: 'Ways of working',
    items: [
      { name: 'Problem solving', tier: 'intermediate' },
      { name: 'Teamwork', tier: 'intermediate' },
    ],
  },
]

export const projects = [
  {
    title: 'Sinefolis — Cinema UI Web Prototype',
    stack: 'HTML · CSS · JavaScript · Figma',
    description:
      'User interface web prototype for Sinefolis Cinema, built for a Human-Computer Interaction project — responsive, interactive browsing, schedule, and booking flows prototyped in Figma then built client-side.',
    github: 'https://github.com/ShaneAnthonyy/Sinefolis',
    figma:
      'https://embed.figma.com/proto/P2vxSJILHFHnUkpAbvp4Dt/HCI?scaling=scale-down&content-scaling=fixed&page-id=0%3A1&node-id=2-39&starting-point-node-id=83%3A2192&show-proto-sidebar=1&embed-host=share',
    featured: true,
  },
  {
    title: 'Heuristic-Augmented Denoising in Distant Supervision for Crypto Assets NER',
    stack: 'IndoBERTweet · CRF · NLP',
    description:
      'Named Entity Recognition research to identify cryptocurrency asset entities in Indonesian-language Twitter text, using a distant supervision approach with heuristic denoising to reduce noisy labels.',
    github: 'https://github.com/SauHin/crypto-ner-indobertweet-crf',
  },
  {
    title: 'A Comparative Study of NLP Models for Emotion Classification on Indonesian-Language Twitter Text',
    stack: 'NLP · Emotion Classification',
    description:
      'Compared the performance of several NLP models in classifying emotions in Indonesian-language Twitter text.',
    github: 'https://github.com/SauHin/emotion-classification',
  },
  {
    title: 'FootFit — Non-Contact Foot Dimension Measurement System',
    stack: 'Classical Computer Vision',
    description:
      'A non-contact foot dimension measurement system built with classical computer vision, designed to support more accurate footwear size recommendations.',
    github: 'https://github.com/ValentinoAllen/FootFit',
  },
  {
    title: 'DevPath — Career Profile Segmentation System',
    stack: 'Data Segmentation',
    description:
      'A career profile segmentation system that groups profiles based on relevant patterns and attributes.',
    github: 'https://github.com/SauHin/DevPath',
  },
  {
    title: 'TixConser App',
    stack: 'Java · Java Swing · CSV',
    description:
      'Aplikasi manajemen tiket konser berbasis Java dengan GUI menggunakan Java Swing dan sistem penyimpanan data berbasis file (CSV).',
    github: 'https://github.com/SauHin/TixConzer',
  },
]

export const certificates = [
  {
    title: 'Microsoft AI-900T00-A: Belajar AI dari Dasar',
    issuer: 'Microsoft Elevate AI Training Session — Pelatihan Azure AI Fundamentals',
    detail: '15 hours of learning · Demonstration of learning',
    date: 'Mar 29, 2026',
    url: 'https://drive.google.com/file/d/1eHgFE3CGTGBndlx5mKH-elODxMNJlwUA/view?usp=sharing',
  },
]

export const contact = {
  phone: '087888960500',
  phoneDisplay: '+62 878-8896-0500',
  phoneHref: 'tel:+6287888960500',
  email: 'shaneanthony736@gmail.com',
  handle: 'shane-anthony26',
  linkedin: 'https://www.linkedin.com/in/shane-anthony26/',
  linkedinLabel: 'linkedin.com/in/shane-anthony26',
  location: 'Tangerang, Indonesia',
  availability: 'Available for Frontend Internship',
  responseTime: 'Open to interviews & collaboration',
}
