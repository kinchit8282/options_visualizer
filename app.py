import streamlit as st
import numpy as np
import plotly.graph_objects as go
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd

st.set_page_config(page_title="Options Visualizer", layout="wide")

st.title("📈 Advanced Options Trading Visualizer")
st.markdown("Learn options strategies through interactive payoff diagrams")

# Add Real Data Toggle
st.sidebar.header("🎯 Data Source")
use_real_data = st.sidebar.checkbox("Use Real Market Data (NVDA)", value=False)

# Fetch NVDA data if enabled
nvda_data = None
current_price = 100
options_chain = None

if use_real_data:
    with st.spinner("Fetching NVDA market data..."):
        try:
            nvda = yf.Ticker("NVDA")
            nvda_data = nvda.history(period="30d")
            current_price = nvda_data['Close'].iloc[-1]

            # Get options expirations and chain
            expirations = nvda.options
            if expirations:
                # Use the first available expiration
                opt_chain = nvda.option_chain(expirations[0])
                options_chain = {
                    'calls': opt_chain.calls,
                    'puts': opt_chain.puts,
                    'expiration': expirations[0]
                }

            # Display market info
            st.sidebar.success(f"✓ NVDA Data Loaded")
            st.sidebar.metric("Current Price", f"${current_price:.2f}")

            if options_chain:
                st.sidebar.caption(f"Options expiring: {options_chain['expiration']}")

        except Exception as e:
            st.sidebar.error(f"Error loading data: {str(e)}")
            use_real_data = False
            current_price = 100

# Strategy definitions
STRATEGIES = {
    "Single Leg": ["Long Call", "Short Call", "Long Put", "Short Put"],
    "Vertical Spreads": ["Bull Call Spread", "Bear Put Spread", "Bull Put Spread", "Bear Call Spread"],
    "Volatility": ["Long Straddle", "Short Straddle", "Long Strangle", "Short Strangle"],
    "Advanced": ["Long Butterfly", "Short Butterfly", "Iron Condor", "Iron Butterfly"]
}

# Flatten strategies for selectbox
all_strategies = []
for category, strats in STRATEGIES.items():
    all_strategies.extend([f"{category}: {s}" for s in strats])

# Sidebar
st.sidebar.header("Strategy Selection")
selected_strategy = st.sidebar.selectbox("Choose Strategy", all_strategies)
strategy_name = selected_strategy.split(": ")[1]

st.sidebar.markdown("---")
st.sidebar.header("Parameters")

# Common parameters
if use_real_data:
    stock_price_center = current_price
    st.sidebar.info(f"Using NVDA current price: ${current_price:.2f}")
else:
    stock_price_center = st.sidebar.slider("Current Stock Price ($)", 50, 200, 100, 5)

contracts = st.sidebar.number_input("Number of Contracts", 1, 10, 1)

# Generate stock price range
stock_prices = np.linspace(stock_price_center * 0.7, stock_price_center * 1.3, 300)

# Helper function to get nearest option premium
def get_option_premium(strike, option_type='call', position='long'):
    if not use_real_data or not options_chain:
        return None

    try:
        df = options_chain['calls'] if option_type == 'call' else options_chain['puts']
        # Find closest strike
        closest_idx = (df['strike'] - strike).abs().idxmin()
        row = df.loc[closest_idx]

        # Use bid for short positions, ask for long positions
        premium = row['bid'] if position == 'short' else row['ask']
        return float(premium) if premium > 0 else None
    except:
        return None

# Strategy-specific parameters and payoff calculations
payoff = np.zeros_like(stock_prices)
legs_info = []
breakeven_points = []
strategy_description = ""
max_profit_calc = 0
max_loss_calc = 0

# Helper function for option payoffs
def long_call_payoff(S, K, premium):
    return np.maximum(S - K, 0) - premium

def short_call_payoff(S, K, premium):
    return premium - np.maximum(S - K, 0)

def long_put_payoff(S, K, premium):
    return np.maximum(K - S, 0) - premium

def short_put_payoff(S, K, premium):
    return premium - np.maximum(K - S, 0)

# Single Leg Strategies
if strategy_name == "Long Call":
    default_strike = int(stock_price_center * 1.05)
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, default_strike, 5)

    real_premium = get_option_premium(strike, 'call', 'long')
    default_premium = real_premium if real_premium else 5
    premium = st.sidebar.slider("Premium Paid ($)", 1.0, 50.0, float(default_premium), 0.5)

    if real_premium:
        st.sidebar.caption(f"💡 Market ask: ${real_premium:.2f}")

    payoff = long_call_payoff(stock_prices, strike, premium) * contracts * 100
    breakeven_points = [strike + premium]
    legs_info = [{"type": "Long Call", "strike": strike, "premium": premium}]

    max_loss_calc = -premium * contracts * 100
    max_profit_calc = "Unlimited"
    strategy_description = f"""
    **Long Call Strategy:**
    - Bullish strategy - profit when stock rises
    - Buy call option at ${strike} strike
    - Pay ${premium:.2f} premium per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max loss: ${-max_loss_calc:.2f} (premium paid)
    - Max profit: Unlimited
    """

elif strategy_name == "Short Call":
    default_strike = int(stock_price_center * 1.05)
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, default_strike, 5)

    real_premium = get_option_premium(strike, 'call', 'short')
    default_premium = real_premium if real_premium else 5
    premium = st.sidebar.slider("Premium Received ($)", 1.0, 50.0, float(default_premium), 0.5)

    if real_premium:
        st.sidebar.caption(f"💡 Market bid: ${real_premium:.2f}")

    payoff = short_call_payoff(stock_prices, strike, premium) * contracts * 100
    breakeven_points = [strike + premium]
    legs_info = [{"type": "Short Call", "strike": strike, "premium": premium}]

    max_profit_calc = premium * contracts * 100
    max_loss_calc = "Unlimited"
    strategy_description = f"""
    **Short Call Strategy:**
    - Bearish/neutral strategy - profit when stock stays below strike
    - Sell call option at ${strike} strike
    - Receive ${premium:.2f} premium per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (premium received)
    - Max loss: Unlimited (if stock rises significantly)
    """

elif strategy_name == "Long Put":
    default_strike = int(stock_price_center * 0.95)
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, default_strike, 5)

    real_premium = get_option_premium(strike, 'put', 'long')
    default_premium = real_premium if real_premium else 5
    premium = st.sidebar.slider("Premium Paid ($)", 1.0, 50.0, float(default_premium), 0.5)

    if real_premium:
        st.sidebar.caption(f"💡 Market ask: ${real_premium:.2f}")

    payoff = long_put_payoff(stock_prices, strike, premium) * contracts * 100
    breakeven_points = [strike - premium]
    legs_info = [{"type": "Long Put", "strike": strike, "premium": premium}]

    max_loss_calc = -premium * contracts * 100
    max_profit_calc = (strike - premium) * contracts * 100
    strategy_description = f"""
    **Long Put Strategy:**
    - Bearish strategy - profit when stock falls
    - Buy put option at ${strike} strike
    - Pay ${premium:.2f} premium per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max loss: ${-max_loss_calc:.2f} (premium paid)
    - Max profit: ${max_profit_calc:.2f} (if stock goes to $0)
    """

elif strategy_name == "Short Put":
    default_strike = int(stock_price_center * 0.95)
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, default_strike, 5)

    real_premium = get_option_premium(strike, 'put', 'short')
    default_premium = real_premium if real_premium else 5
    premium = st.sidebar.slider("Premium Received ($)", 1.0, 50.0, float(default_premium), 0.5)

    if real_premium:
        st.sidebar.caption(f"💡 Market bid: ${real_premium:.2f}")

    payoff = short_put_payoff(stock_prices, strike, premium) * contracts * 100
    breakeven_points = [strike - premium]
    legs_info = [{"type": "Short Put", "strike": strike, "premium": premium}]

    max_profit_calc = premium * contracts * 100
    max_loss_calc = -(strike - premium) * contracts * 100
    strategy_description = f"""
    **Short Put Strategy:**
    - Bullish/neutral strategy - profit when stock stays above strike
    - Sell put option at ${strike} strike
    - Receive ${premium:.2f} premium per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (premium received)
    - Max loss: ${-max_loss_calc:.2f} (if stock goes to $0)
    """

# Vertical Spreads
elif strategy_name == "Bull Call Spread":
    default_long = int(stock_price_center * 0.95)
    default_short = int(stock_price_center * 1.05)

    long_strike = st.sidebar.slider("Long Call Strike ($)", 50, 300, default_long, 5)
    short_strike = st.sidebar.slider("Short Call Strike ($)", long_strike, 300, default_short, 5)

    real_long_prem = get_option_premium(long_strike, 'call', 'long')
    real_short_prem = get_option_premium(short_strike, 'call', 'short')

    long_premium = st.sidebar.slider("Long Call Premium ($)", 1.0, 50.0,
                                     float(real_long_prem) if real_long_prem else 8.0, 0.5)
    short_premium = st.sidebar.slider("Short Call Premium ($)", 1.0, float(long_premium),
                                      float(real_short_prem) if real_short_prem else 3.0, 0.5)

    if real_long_prem and real_short_prem:
        st.sidebar.caption(f"💡 Net debit: ${real_long_prem - real_short_prem:.2f}")

    net_premium = long_premium - short_premium
    leg1 = long_call_payoff(stock_prices, long_strike, long_premium)
    leg2 = short_call_payoff(stock_prices, short_strike, short_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [long_strike + net_premium]
    legs_info = [
        {"type": "Long Call", "strike": long_strike, "premium": long_premium},
        {"type": "Short Call", "strike": short_strike, "premium": short_premium}
    ]

    max_loss_calc = -net_premium * contracts * 100
    max_profit_calc = (short_strike - long_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Bull Call Spread:**
    - Moderately bullish strategy with limited risk and reward
    - Buy call at ${long_strike}, sell call at ${short_strike}
    - Net debit: ${net_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock ≥ ${short_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock ≤ ${long_strike})
    """

elif strategy_name == "Bear Put Spread":
    default_long = int(stock_price_center * 1.05)
    default_short = int(stock_price_center * 0.95)

    long_strike = st.sidebar.slider("Long Put Strike ($)", 50, 300, default_long, 5)
    short_strike = st.sidebar.slider("Short Put Strike ($)", 50, long_strike, default_short, 5)

    real_long_prem = get_option_premium(long_strike, 'put', 'long')
    real_short_prem = get_option_premium(short_strike, 'put', 'short')

    long_premium = st.sidebar.slider("Long Put Premium ($)", 1.0, 50.0,
                                     float(real_long_prem) if real_long_prem else 8.0, 0.5)
    short_premium = st.sidebar.slider("Short Put Premium ($)", 1.0, float(long_premium),
                                      float(real_short_prem) if real_short_prem else 3.0, 0.5)

    net_premium = long_premium - short_premium
    leg1 = long_put_payoff(stock_prices, long_strike, long_premium)
    leg2 = short_put_payoff(stock_prices, short_strike, short_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [long_strike - net_premium]
    legs_info = [
        {"type": "Long Put", "strike": long_strike, "premium": long_premium},
        {"type": "Short Put", "strike": short_strike, "premium": short_premium}
    ]

    max_loss_calc = -net_premium * contracts * 100
    max_profit_calc = (long_strike - short_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Bear Put Spread:**
    - Moderately bearish strategy with limited risk and reward
    - Buy put at ${long_strike}, sell put at ${short_strike}
    - Net debit: ${net_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock ≤ ${short_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock ≥ ${long_strike})
    """

elif strategy_name == "Bull Put Spread":
    default_short = int(stock_price_center * 1.05)
    default_long = int(stock_price_center * 0.95)

    short_strike = st.sidebar.slider("Short Put Strike ($)", 50, 300, default_short, 5)
    long_strike = st.sidebar.slider("Long Put Strike ($)", 50, short_strike, default_long, 5)

    real_short_prem = get_option_premium(short_strike, 'put', 'short')
    real_long_prem = get_option_premium(long_strike, 'put', 'long')

    short_premium = st.sidebar.slider("Short Put Premium ($)", 1.0, 50.0,
                                      float(real_short_prem) if real_short_prem else 8.0, 0.5)
    long_premium = st.sidebar.slider("Long Put Premium ($)", 1.0, float(short_premium),
                                     float(real_long_prem) if real_long_prem else 3.0, 0.5)

    net_premium = short_premium - long_premium
    leg1 = short_put_payoff(stock_prices, short_strike, short_premium)
    leg2 = long_put_payoff(stock_prices, long_strike, long_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [short_strike - net_premium]
    legs_info = [
        {"type": "Short Put", "strike": short_strike, "premium": short_premium},
        {"type": "Long Put", "strike": long_strike, "premium": long_premium}
    ]

    max_profit_calc = net_premium * contracts * 100
    max_loss_calc = -(short_strike - long_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Bull Put Spread:**
    - Bullish strategy that collects premium
    - Sell put at ${short_strike}, buy put at ${long_strike}
    - Net credit: ${net_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock ≥ ${short_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock ≤ ${long_strike})
    """

elif strategy_name == "Bear Call Spread":
    default_short = int(stock_price_center * 0.95)
    default_long = int(stock_price_center * 1.05)

    short_strike = st.sidebar.slider("Short Call Strike ($)", 50, 300, default_short, 5)
    long_strike = st.sidebar.slider("Long Call Strike ($)", short_strike, 300, default_long, 5)

    real_short_prem = get_option_premium(short_strike, 'call', 'short')
    real_long_prem = get_option_premium(long_strike, 'call', 'long')

    short_premium = st.sidebar.slider("Short Call Premium ($)", 1.0, 50.0,
                                      float(real_short_prem) if real_short_prem else 8.0, 0.5)
    long_premium = st.sidebar.slider("Long Call Premium ($)", 1.0, float(short_premium),
                                     float(real_long_prem) if real_long_prem else 3.0, 0.5)

    net_premium = short_premium - long_premium
    leg1 = short_call_payoff(stock_prices, short_strike, short_premium)
    leg2 = long_call_payoff(stock_prices, long_strike, long_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [short_strike + net_premium]
    legs_info = [
        {"type": "Short Call", "strike": short_strike, "premium": short_premium},
        {"type": "Long Call", "strike": long_strike, "premium": long_premium}
    ]

    max_profit_calc = net_premium * contracts * 100
    max_loss_calc = -(long_strike - short_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Bear Call Spread:**
    - Bearish strategy that collects premium
    - Sell call at ${short_strike}, buy call at ${long_strike}
    - Net credit: ${net_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock ≤ ${short_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock ≥ ${long_strike})
    """

# Volatility Strategies
elif strategy_name == "Long Straddle":
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, int(stock_price_center), 5)

    real_call_prem = get_option_premium(strike, 'call', 'long')
    real_put_prem = get_option_premium(strike, 'put', 'long')

    call_premium = st.sidebar.slider("Call Premium ($)", 1.0, 50.0,
                                     float(real_call_prem) if real_call_prem else 8.0, 0.5)
    put_premium = st.sidebar.slider("Put Premium ($)", 1.0, 50.0,
                                    float(real_put_prem) if real_put_prem else 8.0, 0.5)

    total_premium = call_premium + put_premium
    leg1 = long_call_payoff(stock_prices, strike, call_premium)
    leg2 = long_put_payoff(stock_prices, strike, put_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [strike - total_premium, strike + total_premium]
    legs_info = [
        {"type": "Long Call", "strike": strike, "premium": call_premium},
        {"type": "Long Put", "strike": strike, "premium": put_premium}
    ]

    max_loss_calc = -total_premium * contracts * 100
    max_profit_calc = "Unlimited"
    strategy_description = f"""
    **Long Straddle:**
    - Neutral strategy - profit from large moves in either direction
    - Buy call and put at same strike ${strike}
    - Total premium: ${total_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f} and ${breakeven_points[1]:.2f}
    - Max loss: ${-max_loss_calc:.2f} (if stock stays at ${strike})
    - Max profit: Unlimited (large move either direction)
    """

elif strategy_name == "Short Straddle":
    strike = st.sidebar.slider("Strike Price ($)", 50, 300, int(stock_price_center), 5)

    real_call_prem = get_option_premium(strike, 'call', 'short')
    real_put_prem = get_option_premium(strike, 'put', 'short')

    call_premium = st.sidebar.slider("Call Premium ($)", 1.0, 50.0,
                                     float(real_call_prem) if real_call_prem else 8.0, 0.5)
    put_premium = st.sidebar.slider("Put Premium ($)", 1.0, 50.0,
                                    float(real_put_prem) if real_put_prem else 8.0, 0.5)

    total_premium = call_premium + put_premium
    leg1 = short_call_payoff(stock_prices, strike, call_premium)
    leg2 = short_put_payoff(stock_prices, strike, put_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [strike - total_premium, strike + total_premium]
    legs_info = [
        {"type": "Short Call", "strike": strike, "premium": call_premium},
        {"type": "Short Put", "strike": strike, "premium": put_premium}
    ]

    max_profit_calc = total_premium * contracts * 100
    max_loss_calc = "Unlimited"
    strategy_description = f"""
    **Short Straddle:**
    - Neutral strategy - profit when stock stays near strike
    - Sell call and put at same strike ${strike}
    - Total premium received: ${total_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f} and ${breakeven_points[1]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock stays at ${strike})
    - Max loss: Unlimited (large move either direction)
    """

elif strategy_name == "Long Strangle":
    put_strike = st.sidebar.slider("Put Strike ($)", 50, 300, int(stock_price_center * 0.9), 5)
    call_strike = st.sidebar.slider("Call Strike ($)", put_strike, 300, int(stock_price_center * 1.1), 5)

    real_call_prem = get_option_premium(call_strike, 'call', 'long')
    real_put_prem = get_option_premium(put_strike, 'put', 'long')

    call_premium = st.sidebar.slider("Call Premium ($)", 1.0, 50.0,
                                     float(real_call_prem) if real_call_prem else 5.0, 0.5)
    put_premium = st.sidebar.slider("Put Premium ($)", 1.0, 50.0,
                                    float(real_put_prem) if real_put_prem else 5.0, 0.5)

    total_premium = call_premium + put_premium
    leg1 = long_call_payoff(stock_prices, call_strike, call_premium)
    leg2 = long_put_payoff(stock_prices, put_strike, put_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [put_strike - total_premium, call_strike + total_premium]
    legs_info = [
        {"type": "Long Call", "strike": call_strike, "premium": call_premium},
        {"type": "Long Put", "strike": put_strike, "premium": put_premium}
    ]

    max_loss_calc = -total_premium * contracts * 100
    max_profit_calc = "Unlimited"
    strategy_description = f"""
    **Long Strangle:**
    - Neutral strategy - profit from large moves (cheaper than straddle)
    - Buy call at ${call_strike}, buy put at ${put_strike}
    - Total premium: ${total_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f} and ${breakeven_points[1]:.2f}
    - Max loss: ${-max_loss_calc:.2f} (if stock between strikes)
    - Max profit: Unlimited (large move either direction)
    """

elif strategy_name == "Short Strangle":
    put_strike = st.sidebar.slider("Put Strike ($)", 50, 300, int(stock_price_center * 0.9), 5)
    call_strike = st.sidebar.slider("Call Strike ($)", put_strike, 300, int(stock_price_center * 1.1), 5)

    real_call_prem = get_option_premium(call_strike, 'call', 'short')
    real_put_prem = get_option_premium(put_strike, 'put', 'short')

    call_premium = st.sidebar.slider("Call Premium ($)", 1.0, 50.0,
                                     float(real_call_prem) if real_call_prem else 5.0, 0.5)
    put_premium = st.sidebar.slider("Put Premium ($)", 1.0, 50.0,
                                    float(real_put_prem) if real_put_prem else 5.0, 0.5)

    total_premium = call_premium + put_premium
    leg1 = short_call_payoff(stock_prices, call_strike, call_premium)
    leg2 = short_put_payoff(stock_prices, put_strike, put_premium)
    payoff = (leg1 + leg2) * contracts * 100

    breakeven_points = [put_strike - total_premium, call_strike + total_premium]
    legs_info = [
        {"type": "Short Call", "strike": call_strike, "premium": call_premium},
        {"type": "Short Put", "strike": put_strike, "premium": put_premium}
    ]

    max_profit_calc = total_premium * contracts * 100
    max_loss_calc = "Unlimited"
    strategy_description = f"""
    **Short Strangle:**
    - Neutral strategy - profit when stock stays in range
    - Sell call at ${call_strike}, sell put at ${put_strike}
    - Total premium received: ${total_premium:.2f} per share
    - Break-even at ${breakeven_points[0]:.2f} and ${breakeven_points[1]:.2f}
    - Max profit: ${max_profit_calc:.2f} (if stock between strikes)
    - Max loss: Unlimited (large move either direction)
    """

# Advanced Strategies
elif strategy_name == "Long Butterfly":
    lower_strike = st.sidebar.slider("Lower Strike ($)", 50, 300, int(stock_price_center * 0.9), 5)
    middle_strike = st.sidebar.slider("Middle Strike ($)", lower_strike, 300, int(stock_price_center), 5)
    upper_strike = st.sidebar.slider("Upper Strike ($)", middle_strike, 300, int(stock_price_center * 1.1), 5)

    lower_premium = st.sidebar.slider("Lower Call Premium ($)", 1.0, 50.0, 12.0, 0.5)
    middle_premium = st.sidebar.slider("Middle Call Premium ($)", 1.0, 50.0, 7.0, 0.5)
    upper_premium = st.sidebar.slider("Upper Call Premium ($)", 1.0, 50.0, 3.0, 0.5)

    net_premium = lower_premium - 2*middle_premium + upper_premium

    leg1 = long_call_payoff(stock_prices, lower_strike, lower_premium)
    leg2 = 2 * short_call_payoff(stock_prices, middle_strike, middle_premium)
    leg3 = long_call_payoff(stock_prices, upper_strike, upper_premium)
    payoff = (leg1 + leg2 + leg3) * contracts * 100

    legs_info = [
        {"type": "Long Call", "strike": lower_strike, "premium": lower_premium},
        {"type": "Short 2 Calls", "strike": middle_strike, "premium": middle_premium},
        {"type": "Long Call", "strike": upper_strike, "premium": upper_premium}
    ]

    max_loss_calc = -net_premium * contracts * 100
    max_profit_calc = (middle_strike - lower_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Long Butterfly Spread:**
    - Neutral strategy - profit when stock stays near middle strike
    - Buy 1 call at ${lower_strike}, sell 2 calls at ${middle_strike}, buy 1 call at ${upper_strike}
    - Net debit: ${net_premium:.2f} per share
    - Max profit: ${max_profit_calc:.2f} (if stock at ${middle_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock outside wings)
    """

elif strategy_name == "Short Butterfly":
    lower_strike = st.sidebar.slider("Lower Strike ($)", 50, 300, int(stock_price_center * 0.9), 5)
    middle_strike = st.sidebar.slider("Middle Strike ($)", lower_strike, 300, int(stock_price_center), 5)
    upper_strike = st.sidebar.slider("Upper Strike ($)", middle_strike, 300, int(stock_price_center * 1.1), 5)

    lower_premium = st.sidebar.slider("Lower Call Premium ($)", 1.0, 50.0, 12.0, 0.5)
    middle_premium = st.sidebar.slider("Middle Call Premium ($)", 1.0, 50.0, 7.0, 0.5)
    upper_premium = st.sidebar.slider("Upper Call Premium ($)", 1.0, 50.0, 3.0, 0.5)

    net_premium = 2*middle_premium - lower_premium - upper_premium

    leg1 = short_call_payoff(stock_prices, lower_strike, lower_premium)
    leg2 = 2 * long_call_payoff(stock_prices, middle_strike, middle_premium)
    leg3 = short_call_payoff(stock_prices, upper_strike, upper_premium)
    payoff = (leg1 + leg2 + leg3) * contracts * 100

    legs_info = [
        {"type": "Short Call", "strike": lower_strike, "premium": lower_premium},
        {"type": "Long 2 Calls", "strike": middle_strike, "premium": middle_premium},
        {"type": "Short Call", "strike": upper_strike, "premium": upper_premium}
    ]

    max_profit_calc = net_premium * contracts * 100
    max_loss_calc = -(middle_strike - lower_strike - net_premium) * contracts * 100
    strategy_description = f"""
    **Short Butterfly Spread:**
    - Profit when stock moves away from middle strike
    - Sell 1 call at ${lower_strike}, buy 2 calls at ${middle_strike}, sell 1 call at ${upper_strike}
    - Net credit: ${net_premium:.2f} per share
    - Max profit: ${max_profit_calc:.2f} (if stock outside wings)
    - Max loss: ${-max_loss_calc:.2f} (if stock at ${middle_strike})
    """

elif strategy_name == "Iron Condor":
    put_long_strike = st.sidebar.slider("Long Put Strike ($)", 50, 300, int(stock_price_center * 0.85), 5)
    put_short_strike = st.sidebar.slider("Short Put Strike ($)", put_long_strike, 300, int(stock_price_center * 0.95), 5)
    call_short_strike = st.sidebar.slider("Short Call Strike ($)", put_short_strike, 300, int(stock_price_center * 1.05), 5)
    call_long_strike = st.sidebar.slider("Long Call Strike ($)", call_short_strike, 300, int(stock_price_center * 1.15), 5)

    put_long_prem = st.sidebar.slider("Long Put Premium ($)", 1.0, 30.0, 2.0, 0.5)
    put_short_prem = st.sidebar.slider("Short Put Premium ($)", 1.0, 30.0, 5.0, 0.5)
    call_short_prem = st.sidebar.slider("Short Call Premium ($)", 1.0, 30.0, 5.0, 0.5)
    call_long_prem = st.sidebar.slider("Long Call Premium ($)", 1.0, 30.0, 2.0, 0.5)

    net_premium = put_short_prem + call_short_prem - put_long_prem - call_long_prem

    leg1 = long_put_payoff(stock_prices, put_long_strike, put_long_prem)
    leg2 = short_put_payoff(stock_prices, put_short_strike, put_short_prem)
    leg3 = short_call_payoff(stock_prices, call_short_strike, call_short_prem)
    leg4 = long_call_payoff(stock_prices, call_long_strike, call_long_prem)
    payoff = (leg1 + leg2 + leg3 + leg4) * contracts * 100

    legs_info = [
        {"type": "Long Put", "strike": put_long_strike, "premium": put_long_prem},
        {"type": "Short Put", "strike": put_short_strike, "premium": put_short_prem},
        {"type": "Short Call", "strike": call_short_strike, "premium": call_short_prem},
        {"type": "Long Call", "strike": call_long_strike, "premium": call_long_prem}
    ]

    max_profit_calc = net_premium * contracts * 100
    max_loss_calc = -(max(put_short_strike - put_long_strike, call_long_strike - call_short_strike) - net_premium) * contracts * 100
    strategy_description = f"""
    **Iron Condor:**
    - Profit when stock stays in range between short strikes
    - Sell put spread and call spread
    - Net credit: ${net_premium:.2f} per share
    - Profit zone: ${put_short_strike} to ${call_short_strike}
    - Max profit: ${max_profit_calc:.2f} (if stock between short strikes)
    - Max loss: ${-max_loss_calc:.2f} (if stock outside long strikes)
    """

elif strategy_name == "Iron Butterfly":
    wing_distance = st.sidebar.slider("Wing Distance ($)", 5, 50, 10, 5)
    middle_strike = st.sidebar.slider("Middle Strike ($)", 50, 300, int(stock_price_center), 5)

    lower_strike = middle_strike - wing_distance
    upper_strike = middle_strike + wing_distance

    lower_premium = st.sidebar.slider("Long Put Premium ($)", 1.0, 30.0, 3.0, 0.5)
    middle_put_prem = st.sidebar.slider("Short Put Premium ($)", 1.0, 30.0, 10.0, 0.5)
    middle_call_prem = st.sidebar.slider("Short Call Premium ($)", 1.0, 30.0, 10.0, 0.5)
    upper_premium = st.sidebar.slider("Long Call Premium ($)", 1.0, 30.0, 3.0, 0.5)

    net_premium = middle_put_prem + middle_call_prem - lower_premium - upper_premium

    leg1 = long_put_payoff(stock_prices, lower_strike, lower_premium)
    leg2 = short_put_payoff(stock_prices, middle_strike, middle_put_prem)
    leg3 = short_call_payoff(stock_prices, middle_strike, middle_call_prem)
    leg4 = long_call_payoff(stock_prices, upper_strike, upper_premium)
    payoff = (leg1 + leg2 + leg3 + leg4) * contracts * 100

    legs_info = [
        {"type": "Long Put", "strike": lower_strike, "premium": lower_premium},
        {"type": "Short Put", "strike": middle_strike, "premium": middle_put_prem},
        {"type": "Short Call", "strike": middle_strike, "premium": middle_call_prem},
        {"type": "Long Call", "strike": upper_strike, "premium": upper_premium}
    ]

    max_profit_calc = net_premium * contracts * 100
    max_loss_calc = -(wing_distance - net_premium) * contracts * 100
    strategy_description = f"""
    **Iron Butterfly:**
    - Profit when stock stays at middle strike
    - Sell straddle, buy protective wings
    - Net credit: ${net_premium:.2f} per share
    - Max profit: ${max_profit_calc:.2f} (if stock at ${middle_strike})
    - Max loss: ${-max_loss_calc:.2f} (if stock at wings)
    """

# Show NVDA 30-day price chart if real data is enabled
if use_real_data and nvda_data is not None:
    st.subheader("📊 NVDA 30-Day Price History")

    price_fig = go.Figure()
    price_fig.add_trace(go.Candlestick(
        x=nvda_data.index,
        open=nvda_data['Open'],
        high=nvda_data['High'],
        low=nvda_data['Low'],
        close=nvda_data['Close'],
        name='NVDA'
    ))

    price_fig.update_layout(
        title="NVIDIA Stock Price - Last 30 Days",
        yaxis_title="Price ($)",
        xaxis_title="Date",
        height=300,
        showlegend=False
    )

    st.plotly_chart(price_fig, use_container_width=True)

    # Price stats
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Current", f"${current_price:.2f}")
    with col2:
        change_30d = ((current_price - nvda_data['Close'].iloc[0]) / nvda_data['Close'].iloc[0]) * 100
        st.metric("30D Change", f"{change_30d:+.2f}%")
    with col3:
        st.metric("30D High", f"${nvda_data['High'].max():.2f}")
    with col4:
        st.metric("30D Low", f"${nvda_data['Low'].min():.2f}")

# Create the payoff diagram
fig = go.Figure()

# Add current price indicator if using real data
if use_real_data:
    fig.add_vline(x=current_price, line_dash="solid", line_color="purple", line_width=2,
                  annotation_text=f"Current: ${current_price:.2f}",
                  annotation_position="top left")

# Add payoff line
fig.add_trace(go.Scatter(
    x=stock_prices,
    y=payoff,
    mode='lines',
    name='Total Payoff',
    line=dict(color='blue', width=3)
))

# Add break-even lines
for be in breakeven_points:
    fig.add_vline(x=be, line_dash="dash", line_color="green",
                  annotation_text=f"BE: ${be:.2f}",
                  annotation_position="top")

# Add strike price lines
strikes_plotted = set()
for leg in legs_info:
    strike = leg['strike']
    if strike not in strikes_plotted:
        fig.add_vline(x=strike, line_dash="dot", line_color="orange", opacity=0.5)
        strikes_plotted.add(strike)

# Add zero line
fig.add_hline(y=0, line_dash="solid", line_color="gray", opacity=0.5)

# Shade profit/loss regions
if payoff.max() > 0:
    fig.add_hrect(y0=0, y1=payoff.max(), fillcolor="green", opacity=0.1, line_width=0)
if payoff.min() < 0:
    fig.add_hrect(y0=payoff.min(), y1=0, fillcolor="red", opacity=0.1, line_width=0)

# Update layout
fig.update_layout(
    title=f"{strategy_name} Payoff Diagram" + (" - NVDA" if use_real_data else ""),
    xaxis_title="Stock Price at Expiration ($)",
    yaxis_title="Profit/Loss ($)",
    hovermode='x unified',
    height=600,
    showlegend=True
)

# Display the plot
st.plotly_chart(fig, use_container_width=True)

# Educational content
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📚 Strategy Details")
    st.markdown(strategy_description)

    st.subheader("🔧 Position Breakdown")
    for i, leg in enumerate(legs_info, 1):
        st.markdown(f"**Leg {i}:** {leg['type']} @ ${leg['strike']} (Premium: ${leg['premium']:.2f})")

with col2:
    st.subheader("🎯 Key Metrics")

    if breakeven_points:
        if len(breakeven_points) == 1:
            st.metric("Break-even", f"${breakeven_points[0]:.2f}")
        else:
            st.metric("Lower Break-even", f"${breakeven_points[0]:.2f}")
            st.metric("Upper Break-even", f"${breakeven_points[1]:.2f}")

    if isinstance(max_profit_calc, str):
        st.metric("Max Profit", max_profit_calc)
    else:
        st.metric("Max Profit", f"${max_profit_calc:.2f}")

    if isinstance(max_loss_calc, str):
        st.metric("Max Loss", max_loss_calc)
    else:
        st.metric("Max Loss", f"${max_loss_calc:.2f}", delta_color="inverse")

    st.metric("Contracts", contracts)

# Quick Reference
with st.expander("📖 Strategy Quick Reference"):
    st.markdown("""
    ### Single Leg
    - **Long Call**: Bullish, unlimited profit potential
    - **Short Call**: Bearish/neutral, collect premium with unlimited risk
    - **Long Put**: Bearish, profit from decline
    - **Short Put**: Bullish/neutral, collect premium with limited downside

    ### Vertical Spreads
    - **Bull Call Spread**: Moderately bullish, limited risk and reward
    - **Bear Put Spread**: Moderately bearish, limited risk and reward
    - **Bull Put Spread**: Bullish, collect premium with limited risk
    - **Bear Call Spread**: Bearish, collect premium with limited risk

    ### Volatility
    - **Long Straddle**: Profit from large moves either direction
    - **Short Straddle**: Profit from low volatility
    - **Long Strangle**: Cheaper straddle with wider break-evens
    - **Short Strangle**: Collect more premium with wider risk zone

    ### Advanced
    - **Long Butterfly**: Profit when stock stays near middle strike
    - **Short Butterfly**: Profit from movement away from middle
    - **Iron Condor**: Profit from range-bound stock, defined risk
    - **Iron Butterfly**: Profit at exact price, defined risk
    """)
