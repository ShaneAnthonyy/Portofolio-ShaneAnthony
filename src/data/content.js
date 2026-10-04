import cryptoNerBanner from "../assets/project-banners/crypto-ner/heuristic.png";
import EmotNLPBanner from "../assets/project-banners/emotion-classification/emotion.png";
import footfitBanner from "../assets/project-banners/footfit/footfit.png";
import DevPathBanner from "../assets/project-banners/devpath/devpath.png";
import TixConzerBanner from "../assets/project-banners/tixconser/tixconzer.png";

export const profile = {
  name: 'Shane Anthony',
  role: 'Software Developer',
  location: 'Tangerang, Indonesia',
  cvUrl: '/Shane-Anthony-CV.pdf',
}

export const stats = [
  { label: 'Projects', value: '6' },
  { label: 'Skills', value: '16' },
  { label: 'GPA / 4.00', value: '3.48' },
]

export const about = {
  summary: `Passionate Computer Science student and aspiring Software Developer dedicated to bridging the gap between intelligent systems and engaging digital experiences. Equipped with technical skills in frontend development (ReactJS, JavaScript, CSS), UI/UX prototyping (Figma), and AI engineering, including Machine Learning and Natural Language Processing. Eager to apply my problem-solving abilities and self-learning drive in a real-world setting to build responsive, smart applications as a Software Developer Intern.`,
  education: [
    {
      period: 'July 2021 — July 2024',
      school: 'SMAKN Anglo Lippo Cikarang, Bekasi',
      detail: 'Natural Science',
      note: 'Final Score 84 / 100',
    },
    {
      period: 'Sept 2024 — Present',
      school: 'Bina Nusantara University, Tangerang',
      detail: 'Computer Science - Artificial Intelligence',
      note: 'GPA 3.48 / 4.00',
    },
  ],
  languages: [
    { name: 'Indonesian', level: 'Native' },
    { name: 'English', level: 'Advanced' },
  ],
}

export const skillGroups = [
  {
    label: 'Frontend Development',
    items: [
      { name: 'HTML', tier: 'intermediate' },
      { name: 'CSS', tier: 'intermediate' },
      { name: 'JavaScript', tier: 'intermediate' },
      { name: 'React', tier: 'intermediate' },
    ],
  },
  {
    label: 'Backend Development',
    items: [
      { name: 'Python', tier: 'intermediate' },
      { name: 'C', tier: 'intermediate' },
      { name: 'PHP', tier: 'amateur' },
      { name: 'Java', tier: 'amateur' },
      { name: 'MySQL', tier: 'amateur' },
    ],
  },
  {
    label: 'Tools & Frameworks',
    items: [
      { name: 'Visual Studio Code', tier: 'intermediate' },
      { name: 'Figma', tier: 'intermediate' },
      { name: 'GitHub', tier: 'amateur' },
      { name: 'Laravel', tier: 'amateur' },
      { name: 'Vite', tier: 'amateur' },
    ],
  },
  {
    label: 'Professional Skills',
    items: [
      { name: 'Problem solving', tier: 'intermediate' },
      { name: 'Teamwork', tier: 'intermediate' },
    ],
  },
]

const sinefolisPrototypeUrl =
  'https://embed.figma.com/proto/P2vxSJILHFHnUkpAbvp4Dt/HCI?scaling=scale-down&content-scaling=fixed&page-id=0%3A1&node-id=2-39&starting-point-node-id=83%3A2192&show-proto-sidebar=1&embed-host=share'

export const projects = [
  {
    title: 'Sinefolis — Cinema UI Web Prototype',
    role: 'Individual Project',
    year: '2024',
    description: 'A responsive cinema UI prototype for browsing, schedules, and booking flows.',
    banner: { type: 'figma', url: sinefolisPrototypeUrl },
    detail: {
      overview:
        'User interface web prototype for Sinefolis Cinema, built for a Human-Computer Interaction project — responsive, interactive browsing, schedule, and booking flows prototyped in Figma then built client-side.',
    },
    technology: {
      groups: [
        { title: 'Built with', items: ['HTML', 'CSS', 'JavaScript'] },
        { title: 'Design', items: ['Figma'] },
      ],
    },
    links: {
      github: 'https://github.com/ShaneAnthonyy/Sinefolis',
      prototype: sinefolisPrototypeUrl,
    },
    featured: true,
  },
  {
    title: 'Heuristic-Augmented Denoising in Distant Supervision for Crypto Assets NER',
    role: 'Team Project',
    year: '2026',
    description:
      'NER system for Indonesian Twitter/X using IndoBERTweet-CRF, achieving an F1-score of 85.41%.',
    banner: cryptoNerBanner,
    detail: {
      overview:
        'This research project develops a Named Entity Recognition (NER) pipeline for identifying cryptocurrency assets in Indonesian-language Twitter/X text, addressing noisy social media language, high out-of-vocabulary rates, and limited domain-specific annotated data.',
      sections: [
        {
          type: 'methodology',
          title: 'Methodology',
          items: [
            {
              number: '01',
              title: 'Distant Supervision',
              text: 'A Local Knowledge Base derived from CoinGecko is used to generate a Silver Standard containing 25,726 tweets.',
            },
            {
              number: '02',
              title: 'Heuristic-Augmented Denoising',
              text: 'Heuristic rules are introduced to reduce noisy labels caused by lexically ambiguous cryptocurrency terms.',
            },
            {
              number: '03',
              title: 'Hybrid Fine-Tuning',
              text: 'The resulting model is fine-tuned using a manually annotated Gold Standard of 1,461 tweets.',
            },
          ],
        },
        {
          type: 'results',
          title: 'Results',
          metrics: [
            { value: '83.28%', label: 'Precision' },
            { value: '87.65%', label: 'Recall' },
            { value: '85.41%', label: 'F1 Score' },
          ],
        },
        {
          type: 'insights',
          title: 'Ablation Findings',
          items: [
            { text: 'Hybrid fine-tuning contributed 26.36 F1 points.' },
            { text: 'Distant supervision contributed 5.19 F1 points.' },
            { text: 'Heuristic denoising contributed 1.25 F1 points.' },
            { text: 'The CRF layer was indistinguishable from a softmax head under the evaluated single-type schema.' },
          ],
        },
      ],
    },
    technology: {
      groups: [
        { title: 'Model', items: ['IndoBERTweet', 'CRF'] },
        { title: 'Methods', items: ['Distant Supervision', 'Heuristic Denoising'] },
        { title: 'Evaluation', items: ['5-Fold Cross-Validation', 'Bootstrap Resampling'] },
      ],
    },
    links: {
      github: 'https://github.com/SauHin/crypto-ner-indobertweet-crf',
      paper: '/papers/crypto-ner-icimcis.pdf',
    },
  },
  {
    title: 'A Comparative Study of NLP Models for Emotion Classification on Indonesian-Language Twitter Text',
    role: 'Team Project',
    year: '2026',
    description:
      'Comparative NLP study on Indonesian Twitter/X, with IndoBERTweet achieving the best Macro F1-score of 0.76.',
    banner: EmotNLPBanner,
    detail: {
      overview:
        'This research project investigates how different NLP model families perform on noisy and highly imbalanced Indonesian-language Twitter/X text. Using the EmoT dataset from IndoNLU, the study compares classical machine learning models, a sequential BiLSTM architecture, and pretrained transformer models to identify the most effective approach for emotion classification.',
      sections: [
        {
          type: 'approach',
          title: 'Approach',
          items: [
            {
              number: '01',
              title: 'Classical Machine Learning',
              text: 'Complement Naive Bayes (CNB), Support Vector Machine (SVM), and Random Forest were evaluated as traditional machine learning baselines.',
            },
            {
              number: '02',
              title: 'BiLSTM',
              text: 'A Bidirectional Long Short-Term Memory model was trained using FastText embeddings to capture sequential patterns in Indonesian social media text.',
            },
            {
              number: '03',
              title: 'Transformer Models',
              text: 'IndoBERT and Twitter-specific IndoBERTweet were evaluated to measure the impact of domain-specific pretraining on downstream emotion classification.',
            },
          ],
        },
        {
          type: 'dataset',
          title: 'Dataset',
          text: 'The study uses the EmoT dataset from IndoNLU, containing 4,401 Indonesian-language social media samples across five emotion classes.',
        },
        {
          type: 'results',
          title: 'Results',
          metrics: [
            { value: '0.76', label: 'IndoBERTweet Macro F1' },
            { value: '0.70', label: 'IndoBERT Macro F1' },
            { value: '0.69', label: 'CNB Macro F1' },
            { value: '0.67', label: 'SVM Macro F1' },
            { value: '0.64', label: 'Random Forest Macro F1' },
            { value: '0.63', label: 'BiLSTM Macro F1' },
            { value: '0.0066', label: "McNemar's Test p-value" },
          ],
        },
        {
          type: 'insights',
          title: 'Key Findings',
          items: [
            { text: 'Domain similarity between pretraining data and the target task had a stronger effect than model parameter size.' },
            { text: 'CNB provided a stronger baseline than BiLSTM under limited and imbalanced data conditions.' },
            { text: "IndoBERTweet significantly outperformed CNB according to McNemar's Test." },
          ],
        },
      ],
    },
    technology: {
      groups: [
        {
          title: 'Models',
          items: ['Complement Naive Bayes (CNB)', 'SVM', 'Random Forest', 'BiLSTM', 'IndoBERT', 'IndoBERTweet'],
        },
        { title: 'Embeddings', items: ['FastText'] },
        { title: 'Dataset', items: ['EmoT (IndoNLU)'] },
      ],
    },
    links: { github: 'https://github.com/SauHin/emotion-classification' },
  },
  {
    title: 'FootFit — Non-Contact Foot Dimension Measurement System',
    role: 'Team Project',
    year: '2026',
    description:
      'Computer vision system for measuring foot dimensions and classifying foot fit using an ID-1 card as reference.',
    banner: footfitBanner,
    detail: {
      overview:
        'FootFit is a computer vision system designed to estimate foot dimensions from a single photograph without requiring specialized hardware. By placing a standard ID-1 card such as a KTP, ATM, or credit card beside the foot, the system uses the card’s known dimensions to correct perspective, establish scale, measure the foot, and classify its proportions.',
      sections: [
        {
          type: 'approach',
          title: 'How It Works',
          items: [
            {
              number: '01',
              title: 'Reference Card Detection',
              text: 'The system detects the ID-1 card using contour area, extent, and aspect-ratio filtering to identify the reference object in the image.',
            },
            {
              number: '02',
              title: 'Perspective & Scale Correction',
              text: 'The four card corners are ordered and transformed using a homography. Its known 85.60 mm width provides the pixel-to-millimetre scale.',
            },
            {
              number: '03',
              title: 'Foot Segmentation',
              text: 'Gray-world white balancing and OpenCV GrabCut are used to separate the foot from the surrounding floor.',
            },
            {
              number: '04',
              title: 'Measurement',
              text: 'Foot length and width are converted from pixels to millimetres using the calculated pixels-per-millimetre scale.',
            },
            {
              number: '05',
              title: 'Fit Classification',
              text: 'The Foot Index, calculated as width divided by length, is used to classify the foot as Narrow-Fit, Normal-Fit, or Wide-Fit.',
            },
          ],
        },
        {
          type: 'specification',
          title: 'Reference Standard',
          text: 'FootFit uses the ISO/IEC 7810 ID-1 standard, shared by KTP, ATM, and credit cards, with a known physical size of 85.60 × 53.98 mm.',
        },
        {
          type: 'results',
          title: 'Fit Classification',
          metrics: [
            { value: '< 37.71%', label: 'Narrow-Fit' },
            { value: '37.71–42.17%', label: 'Normal-Fit' },
            { value: '≥ 42.17%', label: 'Wide-Fit' },
          ],
        },
        {
          type: 'implementation',
          title: 'Segmentation',
          text: 'No deep-learning framework is used. Segmentation uses GrabCut, an OpenCV graph-cut algorithm.',
        },
        {
          type: 'limitations',
          title: 'Limitations',
          items: [
            { text: 'Measurement accuracy has not yet been formally validated against physically measured feet.' },
            { text: 'Detection depends on the reference card being fully visible and sufficiently contrasted against the floor.' },
            { text: 'GrabCut segmentation can struggle when the foot and floor have similar colors.' },
            { text: 'The current system supports a single ID-1 reference card.' },
          ],
        },
      ],
    },
    technology: {
      groups: [
        { title: 'Computer Vision', items: ['OpenCV', 'GrabCut', 'Contour Detection', 'Homography'] },
        { title: 'Backend', items: ['Python', 'FastAPI', 'Uvicorn'] },
        { title: 'Infrastructure', items: ['Docker', 'Render'] },
      ],
    },
    links: {
      github: 'https://github.com/ValentinoAllen/FootFit',
      live: 'https://footfit.onrender.com/',
    },
  },
  {
    title: 'DevPath — Career Profile Segmentation System',
    role: 'Team Project',
    year: '2026',
    description:
      'Unsupervised ML system that segments developers into six career personas and generates personalized skill-gap insights.',
    banner: DevPathBanner,
    detail: {
      overview:
        'DevPath is a career profile segmentation system designed to help students and early-career developers understand which developer persona best matches their current skill set. Instead of relying on generic career recommendations, the system learns patterns from approximately 23,000 professional developer profiles and uses those patterns to generate a persona, skill gaps, and a learning roadmap.',
      sections: [
        {
          type: 'approach',
          title: 'Segmentation Pipeline',
          items: [
            {
              number: '01',
              title: 'Multi-hot Encoding',
              text: 'User skills are transformed into a 186-dimensional binary representation covering programming languages, frameworks, databases, platforms, environments, and AI technologies.',
            },
            {
              number: '02',
              title: 'UMAP Transformation',
              text: 'The high-dimensional skill representation is reduced to a 15-dimensional embedding using UMAP with Jaccard distance.',
            },
            {
              number: '03',
              title: 'K-Means Clustering',
              text: 'The transformed profiles are assigned to one of six developer personas using a trained K-Means model.',
            },
            {
              number: '04',
              title: 'Profile Analysis',
              text: 'The resulting cluster is used to generate a persona label, confidence score, trait coverage, skill gaps, and a learning roadmap.',
            },
          ],
        },
        {
          type: 'dataset',
          title: 'Dataset',
          text: 'The system is trained using the Stack Overflow Developer Survey 2025. Approximately 48,867 raw responses are reduced to around 23,387 profiles after cleaning.',
        },
        {
          type: 'features',
          title: 'Outputs',
          items: [
            { text: 'Developer persona classification' },
            { text: 'Confidence score based on cluster distances' },
            { text: 'Trait coverage across skill categories' },
            { text: 'Relevant skill gaps' },
            { text: 'Ranked learning roadmap' },
          ],
        },
      ],
    },
    technology: {
      groups: [
        { title: 'Machine Learning', items: ['UMAP', 'K-Means', 'Jaccard Distance'] },
        { title: 'Backend', items: ['Python', 'Flask'] },
        { title: 'Data', items: ['Stack Overflow Developer Survey 2025'] },
      ],
    },
    links: {
      github: 'https://github.com/SauHin/DevPath',
      live: 'http://trydevpath.vercel.app/',
    },
  },
  {
    title: 'TixConzer App',
    role: 'Team Project',
    year: '2025',
    description:
      'Java Swing ticket management application with interactive seating, multi-role access, simulated payments, and CSV persistence.',
    banner: TixConzerBanner,
    detail: {
      overview:
        'TixConzer is a desktop-based concert ticket management application developed in Java Swing. The system provides separate customer and administrator workflows, interactive seat selection, simulated payment methods, and file-based persistence using CSV data. The project focuses on applying object-oriented programming principles to a complete application workflow.',
      sections: [
        {
          type: 'features',
          title: 'Key Features',
          items: [
            {
              number: '01',
              title: 'Interactive Seat Map',
              text: 'A visual grid allows customers to browse and select available Regular and VIP seats, with different states represented visually.',
            },
            {
              number: '02',
              title: 'Multi-Role System',
              text: 'Customers can manage bookings, top up their balance, and view purchased tickets, while administrators can monitor the venue, cancel bookings, and reset data.',
            },
            {
              number: '03',
              title: 'Simulated Payment',
              text: 'The application supports Bank Transfer and Credit Card payment flows, including 16-digit card validation.',
            },
            {
              number: '04',
              title: 'CSV Persistence',
              text: 'User and venue data are automatically stored and retrieved using CSV files.',
            },
          ],
        },
        {
          type: 'architecture',
          title: 'Object-Oriented Design',
          items: [
            {
              title: 'Inheritance',
              text: 'Admin and Customer extend the User abstraction, while VipSeat and RegSeat extend the Seat abstraction.',
            },
            {
              title: 'Polymorphism',
              text: 'Different seat types implement pricing behavior differently, while payment methods provide separate implementations through a shared interface.',
            },
            {
              title: 'Encapsulation',
              text: 'Core object attributes are kept private and accessed through controlled methods such as getters, setters, and domain-specific operations.',
            },
            {
              title: 'Abstraction',
              text: 'Abstract User and Seat classes define shared behavior while preventing generic objects from being instantiated where specialized roles are required.',
            },
          ],
        },
      ],
    },
    technology: {
      groups: [
        { title: 'Language', items: ['Java'] },
        { title: 'GUI', items: ['Java Swing'] },
        { title: 'Persistence', items: ['CSV'] },
      ],
    },
    links: { github: 'https://github.com/SauHin/TixConzer' },
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
  phoneDisplay: '+62 878-8896-0500',
  email: 'shaneanthony736@gmail.com',
  linkedin: 'https://www.linkedin.com/in/shane-anthony26/',
  linkedinLabel: 'linkedin.com/in/shane-anthony26',
  location: 'Tangerang, Indonesia',
  availability: 'Available for Software Developer Internship',
  responseTime: 'Open to interviews & collaboration',
}

export const portfolioSectionIds = ['home', 'about', 'skills', 'projects', 'certificates', 'contact']
