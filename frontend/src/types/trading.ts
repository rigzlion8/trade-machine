export interface BotResponse {
  id: string;
  name: string;
  strategy: string;
  symbol: string;
  balance: number;
  risk_per_trade: number;
  status: string;
  started_at: string;
  total_trades: number;
  total_pnl: number;
  last_signal?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Strategy {
  name: string;
  symbol: string;
  timeframe: string;
  parameters: Record<string, any>;
  performance: Record<string, any>;
}

export interface Trade {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  pnl: number;
}

export interface Signal {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  strength: number;
  reason: string;
}

export interface Performance {
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  win_rate: number;
  avg_trade_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
}

export interface ActivityData {
  trades?: Trade[];
  signals?: Signal[];
  performance?: Performance;
  metadata?: {
    bot_id: string;
    bot_name: string;
    start_date: string;
    end_date: string;
    activity_type: string;
    total_records: number;
  };
}
