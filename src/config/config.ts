export interface POSConfig {
  businessName: string;
  themeColor: string;
  logo: string;
}

const defaultConfig: POSConfig = {
  businessName: "My POS System",
  themeColor: "#000000",
  logo: "/assets/default-logo.png",
};

const clientConfig: Partial<POSConfig> = {
  businessName: "Happy Pill Cafe",
  themeColor: "#FFDD00",
};

export const config: POSConfig = {
  ...defaultConfig,
  ...clientConfig,
};