# Options Visualizer

An interactive Streamlit app for learning how stock options work through visual payoff diagrams.

## Features

- **Interactive Payoff Diagrams**: Visualize profit/loss for call and put options
- **Real-time Parameter Adjustment**: Change strike price, premium, and number of contracts
- **Educational Content**: Learn how options work with examples and explanations
- **Break-even Analysis**: See exactly where your option becomes profitable

## Installation

```bash
cd options-visualizer
pip install -r requirements.txt
```

## Usage

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

## Learning Path

1. **Start with Call Options**: Understand the right to buy
2. **Explore Put Options**: Understand the right to sell
3. **Adjust Parameters**: See how strike price and premium affect payoff
4. **Find Break-even**: Learn where you start making money

## Future Enhancements

- [ ] Multi-leg strategies (spreads, straddles, iron condors)
- [ ] Greeks visualization (Delta, Gamma, Theta, Vega)
- [ ] Time decay animation
- [ ] Implied volatility impact
- [ ] Real market data integration
- [ ] Strategy comparison tool
