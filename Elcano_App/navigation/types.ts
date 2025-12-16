import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Offers: undefined;
  Achievements: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  OfferQR: {
    offerId: string;
    partnerName: string;
    reward: string;
    redemptionId: string;
    expiresAt: number;
  };
};
