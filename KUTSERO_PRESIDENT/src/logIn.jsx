import React from 'react';

function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = '/dashboard';
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          height: 100%;
        }

        .login-wrapper {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f8f9fa;
          overflow: hidden;
          position: relative;
        }

        .animated-background {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(210, 105, 30, 0.2);
          animation: float infinite ease-in-out;
        }

        .circle:nth-child(1) { width: 80px; height: 80px; top: 10%; left: 20%; animation-delay: 0s; animation-duration: 12s; }
        .circle:nth-child(2) { width: 120px; height: 120px; top: 60%; left: 75%; animation-delay: 3s; animation-duration: 18s; }
        .circle:nth-child(3) { width: 60px; height: 60px; top: 30%; left: 50%; animation-delay: 6s; animation-duration: 15s; }
        .circle:nth-child(4) { width: 100px; height: 100px; top: 80%; left: 10%; animation-delay: 9s; animation-duration: 20s; }
        .circle:nth-child(5) { width: 40px; height: 40px; top: 20%; left: 85%; animation-delay: 12s; animation-duration: 13s; }
        .circle:nth-child(6) { width: 70px; height: 70px; top: 15%; left: 60%; animation-delay: 1s; animation-duration: 17s; }
        .circle:nth-child(7) { width: 50px; height: 50px; top: 70%; left: 30%; animation-delay: 5s; animation-duration: 19s; }
        .circle:nth-child(8) { width: 90px; height: 90px; top: 40%; left: 10%; animation-delay: 7s; animation-duration: 21s; }
        .circle:nth-child(9) { width: 110px; height: 110px; top: 50%; left: 90%; animation-delay: 2s; animation-duration: 16s; }
        .circle:nth-child(10){ width: 30px; height: 30px; top: 85%; left: 50%; animation-delay: 4s; animation-duration: 14s; }

        @keyframes float {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-100px) translateX(50px) scale(1.2); opacity: 0.7; }
          100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.4; }
        }

        .container {
          display: flex;
          width: 900px;
          height: 600px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          border-radius: 20px;
          overflow: hidden;
          animation: fadeIn 1s ease forwards;
          position: relative;
          z-index: 1;
        }

        .left-panel,
        .right-panel {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }

        .left-panel {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          animation: slideLeft 1s ease forwards;
          flex: 1;
        }

        .right-panel {
          background: linear-gradient(135deg, #D2691E 0%, #CD853F 100%);
          color: white;
          animation: slideRight 1s ease forwards;
          flex: 1;
        }

        .horse-image {
          width: 120px;
          height: 120px;
          margin-bottom: 1rem;
          object-fit: contain;
        }

        .brand-title {
          font-size: 2.8rem;
          font-weight: 700;
          color: #8B4513;
          letter-spacing: 2px;
          margin-bottom: 0.5rem;
        }

        .brand-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: #8B4513;
          text-align: center;
          line-height: 1.2;
        }

        .login-form {
          width: 100%;
          max-width: 350px;
          animation: fadeInUp 1s ease forwards;
        }

        .welcome-text {
          text-align: center;
          margin-bottom: 2rem;
        }

        .welcome-text h1 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .welcome-text p {
          font-size: 1rem;
          opacity: 0.9;
        }

        .form-group {
          margin-bottom: 1.2rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 0.9rem 1.2rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.7);
        }

        .form-group input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.15);
        }

        .forgot-password {
          text-align: right;
          margin-bottom: 1.5rem;
        }

        .forgot-password a {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          text-decoration: none;
          font-style: italic;
        }

        .forgot-password a:hover {
          color: white;
        }

        .login-button {
          width: 100%;
          padding: 1rem;
          background: white;
          color: #D2691E;
          border: none;
          border-radius: 50px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .login-button:hover {
          background: #f1f1f1;
          transform: translateY(-2px);
        }

        .login-button:active {
          transform: translateY(0);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* Media Queries only affect smaller screens */
        @media (max-width: 992px) {
          .container {
            width: 90%;
            height: auto;
            flex-direction: column;
            border-radius: 10px;
          }

          .left-panel, .right-panel {
            padding: 1.5rem;
            min-height: auto;
          }

          .right-panel {
            min-height: 400px;
          }
        }

        @media (max-width: 480px) {
          .container {
            width: 100%;
            margin: 0;
            border-radius: 0;
            height: auto;
          }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="animated-background">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="circle"></div>
          ))}
        </div>

        <div className="container">
          <div className="left-panel">
            <img src="/Images/logo.png" alt="Horse silhouette" className="horse-image" />
            <h1 className="brand-title">ECHO</h1>
            <div className="brand-text">KUTSERO PRESIDENT LOGIN</div>
          </div>

          <div className="right-panel">
            <div className="login-form">
              <div className="welcome-text">
                <h1>Welcome back!</h1>
                <p>Sign in to your account</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" placeholder="Enter your username" required />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" placeholder="Enter your password" required />
                </div>
                <div className="forgot-password">
                  <a href="#">Forgot Password?</a>
                </div>
                <button type="submit" className="login-button">Login</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
