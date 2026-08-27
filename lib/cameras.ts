export type PrimaryBorderCamera = {
  id: string;
  kind: 'primary';
  name: string;
  location: string;
  provider: string;
  sourceUrl: string;
};

export type EmbeddedBorderCamera = {
  id: string;
  kind: 'embedded';
  name: string;
  location: string;
  provider: string;
  sourceUrl: string;
  embedUrl: string;
};

export type BorderCamera = PrimaryBorderCamera | EmbeddedBorderCamera;

export const PRIMARY_CAMERA: PrimaryBorderCamera = {
  id: 'br277-sentido-ponte',
  kind: 'primary',
  name: 'BR-277 — sentido Ponte da Amizade',
  location: 'Foz do Iguaçu · Brasil',
  provider: 'Portal da Cidade',
  sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo',
};

export const EMBEDDED_CAMERAS: EmbeddedBorderCamera[] = [
  {
    id: 'br277-aduana',
    kind: 'embedded',
    name: 'BR-277 — Aduana da Ponte da Amizade',
    location: 'Foz do Iguaçu · Brasil',
    provider: 'Portal da Cidade',
    sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo/br-277-aduana-ponte-da-amizade',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/portovelhomamore//false/false/dmlkZW8wNC5sb2dpY2Fob3N0LmNvbS5icisx/16:9/YUhSMGNITTZMeTg9K1o=/fozaduanapontedaamizade.stream/',
  },
  {
    id: 'amizade-paraguai',
    kind: 'embedded',
    name: 'Ponte da Amizade — sentido Paraguai',
    location: 'Brasil → Paraguai',
    provider: 'Portal da Cidade',
    sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo/ponte-da-amizade-sentido-paraguai',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/portovelhomamore//false/false/V2tjeGMyRXhjRmhQU0dSUFVYcFdlbGxxU210alJtdDVVbTA1YVUwd05IZFVSekZQWkcxS1ZFNVhiR3BhZWpBNStS/16:9/V1ZWb1UwMUhUa2xVVkZwTlpWUm5PUT09K1I=/fozpontedaamizadesentidoparaguai.stream/',
  },
  {
    id: 'amizade-brasil',
    kind: 'embedded',
    name: 'Ponte da Amizade — sentido Brasil',
    location: 'Paraguai → Brasil',
    provider: 'Portal da Cidade',
    sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo/ponte-da-amizade-sentido-brasil',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/portovelhomamore//false/false/V2tjeGMyRXhjRmhQU0dSUFVYcFdlbGxxU210alJtdDVVbTA1YVUwd05IZFVSekZQWkcxS1ZFNVhiR3BhZWpBNStS/16:9/V1ZWb1UwMUhUa2xVVkZwTlpWUm5PUT09K1I=/fozpontedaamizadesentidobrasil.stream/',
  },
  {
    id: 'tancredo-argentina',
    kind: 'embedded',
    name: 'Ponte Tancredo Neves — sentido Argentina',
    location: 'Foz do Iguaçu → Puerto Iguazú',
    provider: 'Portal da Cidade',
    sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo/ponte-tancredo-neves-sentido-argentina',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/portaldacidade//false/false/Wkcxc2ExcFhPSGROYVRWellqSmtjRmt5Um05aU0wNHdURzFPZG1KVE5XbGpaejA5KzM=/16:9/YUhSMGNITTZMeTg9K1o=/fozpontetancredoneves.stream/',
  },
  {
    id: 'integracao-paraguai',
    kind: 'embedded',
    name: 'Ponte da Integração — sentido Paraguai',
    location: 'Foz do Iguaçu → Presidente Franco',
    provider: 'Portal da Cidade',
    sourceUrl: 'https://foz.portaldacidade.com/cameras-ao-vivo/ponte-da-integracao-sentido-paraguai',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/portaldacidade//false/false/ZG1sa1pXOHdNaTVzYjJkcFkyRm9iM04wTG1OdmJTNWljZz09K1o=/16:9/aHR0cHM6Ly8rMQ==/fozpontedaintegracao.stream/',
  },
  {
    id: 'atacado-connect-ponte',
    kind: 'embedded',
    name: 'Atacado Connect — vista da ponte',
    location: 'Ciudad del Este · Paraguai',
    provider: 'Atacado Connect',
    sourceUrl: 'https://atacadoconnect.com/',
    embedUrl: 'https://playerv.logicahost.com.br/video-ip-camera/brimostech//true/true/Wkcxc2ExcFhPSGROYVRWellqSmtjRmt5Um05aU0wNHdURzFPZG1KVE5XbGpaejA5KzM=/16:9/WVVoU01HTklUVFpNZVRnOSsz/camatg01.stream/',
  },
  {
    id: 'mega-cruzamento',
    kind: 'embedded',
    name: 'Mega Eletrônicos — cruzamento',
    location: 'Ciudad del Este · Paraguai',
    provider: 'Mega Eletrônicos',
    sourceUrl: 'https://www.megaeletronicos.com/',
    embedUrl: 'https://megacruzamento.netlify.app/',
  },
  {
    id: 'mega-vista-ponte',
    kind: 'embedded',
    name: 'Mega Eletrônicos — vista da ponte',
    location: 'Ciudad del Este · Paraguai',
    provider: 'Mega Eletrônicos',
    sourceUrl: 'https://www.megaeletronicos.com/',
    embedUrl: 'https://megaeletronicosponte.netlify.app/',
  },
];

export const BORDER_CAMERAS: BorderCamera[] = [
  PRIMARY_CAMERA,
  ...EMBEDDED_CAMERAS,
];
