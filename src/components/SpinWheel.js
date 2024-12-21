import React, { useState } from "react";
import { supabase } from "../config/supabaseClient";
import "./SpinWheel.css";

const SpinWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCooldownMessage, setShowCooldownMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTime, setCooldownTime] = useState("");
  const [coins, setCoins] = useState(0);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
  });

  // Keep original segment variety but note indices of 5 coins for targeting
  const segments = [
    { text: "5 Coins", color: "#FF69B4", value: 5 },
    { text: "10 Coins", color: "#FF0000", value: 10 },
    { text: "5 Coins", color: "#FF69B4", value: 5 },
    { text: "15 Coins", color: "#808080", value: 15 },
    { text: "5 Coins", color: "#FF69B4", value: 5 },
    { text: "20 Coins", color: "#90EE90", value: 20 },
    { text: "30 Coins", color: "#FFD700", value: 30 },
    { text: "5 Coins", color: "#FF69B4", value: 5 },
    { text: "50 Coins", color: "#4169E1", value: 50 },
    { text: "100 Coins", color: "#00CED1", value: 100 },
    { text: "10 Coins", color: "#FF0000", value: 10 },
    { text: "15 Coins", color: "#808080", value: 15 },
    { text: "10 Coins", color: "#FF0000", value: 10 },
    { text: "200 Coins", color: "#FFA500", value: 200 },
  ];

  // Get indices of all 5-coin segments
  const fiveCoinIndices = segments
    .map((segment, index) => (segment.value === 5 ? index : -1))
    .filter((index) => index !== -1);

  const polarToCartesian = (centerX, centerY, radius, angle) => {
    const angleInRadians = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const getSegmentPath = (index) => {
    const angle = 360 / segments.length;
    const startAngle = index * angle - 90 + angle / 2;
    const endAngle = startAngle + angle;
    const start = polarToCartesian(150, 150, 150, startAngle);
    const end = polarToCartesian(150, 150, 150, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      "M",
      150,
      150,
      "L",
      start.x,
      start.y,
      "A",
      150,
      150,
      0,
      largeArcFlag,
      1,
      end.x,
      end.y,
      "Z",
    ].join(" ");
  };

  const getTextPath = (index) => {
    const angle = 360 / segments.length;
    const midAngle = (index * angle + angle / 2 - 90) * (Math.PI / 180);
    const x2 = 150 + 130 * Math.cos(midAngle);
    const y2 = 150 + 130 * Math.sin(midAngle);
    return `M 150,150 L ${x2},${y2}`;
  };

  const calculateTimeRemaining = (lastSpinTime) => {
    const lastSpin = new Date(lastSpinTime);
    const now = new Date();
    const diff = 24 * 60 * 60 * 1000 - (now - lastSpin);

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    // Always choose one of the 5-coin segments
    const winningIndex =
      fiveCoinIndices[Math.floor(Math.random() * fiveCoinIndices.length)];
    const baseSpins = (Math.floor(Math.random() * 5) + 5) * 360; // 5-10 full spins
    const targetRotation =
      baseSpins + (360 - winningIndex * (360 / segments.length));

    setRotation(targetRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setShowModal(true);
    }, 4000);
  };

  const checkSpinEligibility = async (email, phone) => {
    try {
      // Fix: Properly format the OR condition
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq."${email}",phone.eq."${phone}"`)
        .single();

      if (!existingUser) return true;

      const { data: lastSpin } = await supabase
        .from('spins')
        .select('spin_time')
        .eq('user_id', existingUser.id)
        .order('spin_time', { ascending: false })
        .limit(1)
        .single();

      if (!lastSpin) return true;

      const timeSinceLastSpin = new Date() - new Date(lastSpin.spin_time);
      
      if (timeSinceLastSpin < 24 * 60 * 60 * 1000) {
        // Calculate remaining time
        const remainingTime = calculateTimeRemaining(lastSpin.spin_time);
        setCooldownTime(remainingTime);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking spin eligibility:', error);
      // In case of error, prevent spin to be safe
      return false;
    }
};

  const handleClaimPrize = () => {
    setShowModal(false);
    setShowRegisterPopup(true);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const canSpin = await checkSpinEligibility(formData.email, formData.phone);
      
      if (!canSpin) {
        setShowRegisterPopup(false);
        setShowCooldownMessage(true);
        setTimeout(() => setShowCooldownMessage(false), 3000);
        return;
      }
  
      // Simulate a minimum loading time for better UX
      await Promise.all([
        // Your existing Supabase operations
        (async () => {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('phone', formData.phone)
            .single();
  
          let userId;
  
          if (existingUser) {
            const { data: updatedUser } = await supabase
              .from('users')
              .update({ 
                coins: existingUser.coins + 5,
                email: formData.email
              })
              .eq('id', existingUser.id)
              .select()
              .single();
  
            userId = existingUser.id;
            setCoins(updatedUser.coins);
          } else {
            const { data: newUser } = await supabase
              .from('users')
              .insert([{ 
                email: formData.email,
                phone: formData.phone,
                coins: 5
              }])
              .select()
              .single();
  
            userId = newUser.id;
            setCoins(newUser.coins);
          }
  
          await supabase
            .from('spins')
            .insert([{ user_id: userId }]);
        })(),
        // Minimum delay for animation
        new Promise(resolve => setTimeout(resolve, 1500))
      ]);
  
      setShowRegisterPopup(false);
      setShowSuccessMessage(true);
      setFormData({ email: '', phone: '' });
  
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <svg
            className="wallet-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M21 7H3V5h18v2zm0 10H3V9h18v8zm-4-4H5v2h12v-2z" />
          </svg>
          {coins} Coins
        </div>
        <div className="header-center">
          <img src="/buyonegramlogo.jpeg" alt="Logo" className="logo" />
        </div>
        <div className="header-right">
          <button className="shop-now-button">Shop Now</button>
        </div>
      </header>

      <div className="main-content">
        <div className="wheel-container">
          <div className="pointer"></div>
          <div className="wheel-wrapper">
            <svg
              className={`wheel ${isSpinning ? "spinning" : ""}`}
              viewBox="0 0 300 300"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <defs>
                {segments.map((_, index) => (
                  <path
                    key={`text-path-${index}`}
                    id={`text-path-${index}`}
                    d={getTextPath(index)}
                  />
                ))}
              </defs>
              <g>
                {segments.map((segment, index) => (
                  <g key={index}>
                    <path
                      d={getSegmentPath(index)}
                      fill={segment.color}
                      stroke="white"
                      strokeWidth="1"
                    />
                    <text
                      dy="-5"
                      fill="white"
                      style={{
                        fontSize: "13px",
                        fontWeight: "bold",
                        filter: "drop-shadow(1px 1px 1px rgba(0,0,0,0.5))",
                      }}
                    >
                      <textPath
                        href={`#text-path-${index}`}
                        startOffset="50%"
                        textAnchor="start"
                      >
                        {segment.text}
                      </textPath>
                    </text>
                  </g>
                ))}
                <circle cx="150" cy="150" r="40" fill="black" />
              </g>
            </svg>
          </div>

          <button
            className="spin-button"
            onClick={spinWheel}
            disabled={isSpinning}
          >
            {isSpinning ? "Spinning..." : "SPIN"}
          </button>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>🎉 Congratulations!</h2>
              <p>You've won 5 coins!</p>
              <button className="continue-button" onClick={handleClaimPrize}>
                Claim Prize
              </button>
            </div>
          </div>
        )}

        {showRegisterPopup && (
          <div
            className="modal-overlay"
            onClick={() => setShowRegisterPopup(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Register to Claim</h2>
              {isSubmitting ? (
                <>
                  <div className="loading-animation">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                  <p style={{ textAlign: "center" }}>
                    Adding coins to wallet...
                  </p>
                </>
              ) : (
                <div
                  className={`form-container ${isSubmitting ? "loading" : ""}`}
                >
                  <form onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label htmlFor="email">Email:</label>
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Phone:</label>
                      <input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        pattern="[0-9]{10}"
                        title="Please enter a valid 10-digit phone number"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <button
                      type="submit"
                      className="submit-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : "Submit"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add this for the floating coins animation */}
        {isSubmitting && <div className="coins-animation">🪙 +5</div>}

        {showSuccessMessage && (
          <div
            className="modal-overlay"
            onClick={() => setShowSuccessMessage(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>🎉 Congratulations!</h2>
              <p>Coin added successfully in wallet.</p>
            </div>
          </div>
        )}

        {showCooldownMessage && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Please Wait</h2>
              <p>You can spin again in {cooldownTime}</p>
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="marquee-container">
          <div className="marquee-content">
            {Array.from({ length: 10 }).map((_, i) => (
              <img
                key={i}
                src="/buyonegramlogo.jpeg"
                alt="Marquee"
                className="marquee-img"
              />
            ))}
          </div>
        </div>
      </footer>
    </>
  );
};

export default SpinWheel;
