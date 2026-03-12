export interface SystemSettings {
    productionGoal: number;
    criticalCashThreshold: number;
    reinvestmentLogicEnabled: boolean;
    hybridRedundancyEnabled: boolean;
    notifications: {
        slack: boolean;
        email: boolean;
        push: boolean;
    };
    security: {
        twoFactorEnabled: boolean;
        sessionTimeoutMinutes: number;
    };
}

export const DEFAULT_SETTINGS: SystemSettings = {
    productionGoal: 150000,
    criticalCashThreshold: 2000,
    reinvestmentLogicEnabled: true,
    hybridRedundancyEnabled: true,
    notifications: {
        slack: true,
        email: true,
        push: false
    },
    security: {
        twoFactorEnabled: false,
        sessionTimeoutMinutes: 45
    }
};
