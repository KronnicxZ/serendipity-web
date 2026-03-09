export type TrafficLightStatus = 'red' | 'amber' | 'green';

export interface OrderStatusHistory {
    status: TrafficLightStatus;
    timestamp: string;
    reason?: string;
    updatedBy?: string;
}

export interface StationMovement {
    stationId: string;
    enteredAt: string;
    exitedAt?: string;
}

export interface Order {
    id: string;
    qrCode: string;
    status: TrafficLightStatus;
    customer: string;
    product: string;
    quantity: number;
    unit: string;
    dueDate: string;
    createdAt: string;
    updatedAt: string;
    statusHistory: OrderStatusHistory[];
    currentStationId: string;
    stationHistory: StationMovement[];
    notes?: string;
    assignedTo?: string;
}

export interface Station {
    id: string;
    name: string;
    status: 'completed' | 'in-progress' | 'pending';
    color: string;
    description?: string;
    orderCount: number;
    order_index?: number;
}

export interface OperationSummary {
    totalOrders: number;
    activeOrders: number;
    completedToday: number;
    averageCycleTime: string;
}
