document.addEventListener('DOMContentLoaded', () => {
  // --- Supabase Initialization ---
  const SUPABASE_URL = 'https://zrpgdyppyfindwwcllbe.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycGdkeXBweWZpbmR3d2NsbGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTkyNDMsImV4cCI6MjA5MzUzNTI0M30.9QtgoOBfMqrGRXUoyNvWDYTrXEzSdqDus4pW0uQeY24';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- View Management ---
  const views = {
    auth: document.getElementById('auth-view'),
    tutorial: document.getElementById('tutorial-view'),
    intent: document.getElementById('intent-view'),
    results: document.getElementById('results-view')
  };

  function showView(viewName) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
  }

  // --- Session Management ---
  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      showView('intent');
    } else {
      showView('auth');
    }
  }
  checkSession();

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      if (localStorage.getItem('voyage_tutorial_seen')) {
        showView('intent');
      } else {
        initTutorial();
        showView('tutorial');
      }
    } else if (event === 'SIGNED_OUT') {
      showView('auth');
    }
  });

  // --- Auth Flow ---
  const loginForm = document.getElementById('login-form');
  const forgotForm = document.getElementById('forgot-form');
  const showSignupLink = document.getElementById('show-signup-link');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const backToLoginLink = document.getElementById('back-to-login-link');
  const authError = document.getElementById('auth-error');
  const logoutBtn = document.getElementById('logout-btn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      showView('auth');
    });
  }
  
  let isSignup = false;

  showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignup = !isSignup;
    showSignupLink.textContent = isSignup ? 'Back to Login' : 'Create Account';
    loginForm.querySelector('button').textContent = isSignup ? 'Sign Up' : 'Continue Journey';
    if(authError) authError.classList.add('hidden');
  });

  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    forgotForm.classList.remove('hidden');
    if(authError) authError.classList.add('hidden');
  });

  backToLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('button');
    const originalText = btn.textContent;
    
    btn.textContent = 'Loading...';
    btn.disabled = true;
    if(authError) authError.classList.add('hidden');

    let error = null;

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      error = signUpError;
      if (!error && data.user && data.user.identities && data.user.identities.length === 0) {
        error = { message: "User already exists. Please log in." };
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      error = signInError;
    }

    if (error) {
      if(authError) {
        authError.textContent = error.message;
        authError.classList.remove('hidden');
      } else {
        alert(error.message);
      }
      btn.textContent = originalText;
      btn.disabled = false;
    } else {
      btn.textContent = 'Success!';
      btn.disabled = false;
    }
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      alert(error.message);
    } else {
      alert('Password reset link sent to your email.');
      forgotForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });
  }

  // --- Tutorial Carousel ---
  const carouselContainer = document.getElementById('tutorial-carousel');
  const dotsContainer = document.getElementById('tutorial-dots');
  const nextSlideBtn = document.getElementById('next-slide-btn');
  let currentSlide = 0;

  function initTutorial() {
    carouselContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    onboardingSlides.forEach((slide, index) => {
      // Create slide
      const slideEl = document.createElement('div');
      slideEl.className = `slide ${index === 0 ? 'active' : ''}`;
      slideEl.style.backgroundImage = `url('${slide.image}')`;
      slideEl.innerHTML = `
        <div class="slide-content">
          <h2>${slide.title}</h2>
          <p>${slide.desc}</p>
        </div>
      `;
      carouselContainer.appendChild(slideEl);

      // Create dot
      const dot = document.createElement('div');
      dot.className = `dot ${index === 0 ? 'active' : ''}`;
      dotsContainer.appendChild(dot);
    });
  }

  nextSlideBtn.addEventListener('click', () => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    
    currentSlide++;
    
    if (currentSlide >= onboardingSlides.length) {
      localStorage.setItem('voyage_tutorial_seen', 'true');
      showView('intent');
    } else {
      slides[currentSlide].classList.add('active');
      dots[currentSlide].classList.add('active');
      if (currentSlide === onboardingSlides.length - 1) {
        nextSlideBtn.textContent = "Start Exploring";
      }
    }
  });

  // --- Intent Capture ---
    const originState = document.getElementById('origin-state');
    const originRegion = document.getElementById('origin-region');
    
    originState.addEventListener('change', () => {
      // For now we treat all as India origin but we can map specific airports
      originRegion.value = "India";
    });

    const intentForm = document.getElementById('intent-form');
  const generateBtn = document.querySelector('.generate-btn');
  const btnText = document.querySelector('.btn-text');
  const loader = document.querySelector('.loader');
  const vibeChips = document.querySelectorAll('.chip');
  let activeVibe = 'mountain';

  vibeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      vibeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeVibe = chip.getAttribute('data-vibe');
    });
  });

  // Handle Group Type Pills
  const groupPills = document.querySelectorAll('#group-type .pill');
  let activeGroup = 'solo';
  groupPills.forEach(pill => {
    pill.addEventListener('click', () => {
      groupPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeGroup = pill.getAttribute('data-group');
    });
  });

  // Handle Duration Pills
  const durationPills = document.querySelectorAll('#duration-pills .pill');
  const durationInput = document.getElementById('trip-duration');
  durationPills.forEach(pill => {
    pill.addEventListener('click', () => {
      durationPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      durationInput.value = pill.getAttribute('data-days');
    });
  });

  intentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Animate loader
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');
    generateBtn.disabled = true;

    // Map 0,1,2 to 0,50,100
    const energyVal = document.getElementById('vibe-energy').value * 50;
    const budgetVal = document.getElementById('vibe-budget').value * 50;
    const duration = document.getElementById('trip-duration').value || 7;
    const GROQ_API_KEY = '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';

    try {
      // PHASE 1: Strict Filtering & Scoring
      // Only show destinations that actually match the selected vibe
      const filteredDestinations = mockDestinations.filter(dest => dest.vibe.includes(activeVibe));
      
      if (filteredDestinations.length === 0) {
        destinationFeed.innerHTML = `
          <div style="height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem;">
            <div>
              <h2 class="brand-title">No ${activeVibe} spots found</h2>
              <p class="dest-desc">Try picking another vibe or adjusting your preferences!</p>
              <button class="btn primary-btn" onclick="document.getElementById('back-to-intent-btn').click()">Back to Discovery</button>
            </div>
          </div>
        `;
        showView('results');
        return;
      }

      const scoredDestinations = filteredDestinations.map(dest => {
        let score = 0;
        
        // 1. Vibe Matching (Already filtered)
        score += 50;

        // 2. Slider matching (Mapping 0,50,100 from 0,1,2)
        if (energyVal > 60 && (dest.vibe.includes('high_energy') || dest.vibe.includes('adventure'))) score += 15;
        if (energyVal < 40 && (dest.vibe.includes('chill') || dest.vibe.includes('relax'))) score += 15;

        // 3. Explicit Budget matching
        let budgetScore = 0;
        if (budgetVal === 0) { // User wants Budget
          if (dest.budgetTier === '$') budgetScore = 60;
          else if (dest.budgetTier === '$$') budgetScore = 20;
          else budgetScore = -50; // Penalize luxury when seeking budget
        } else if (budgetVal === 100) { // User wants Luxury
          if (dest.budgetTier === '$$$') budgetScore = 60;
          else if (dest.budgetTier === '$$') budgetScore = 20;
          else budgetScore = -20;
        } else { // User wants Mid-Range
          if (dest.budgetTier === '$$') budgetScore = 60;
          else budgetScore = 10;
        }
        score += budgetScore;

        return { ...dest, matchScore: Math.min(99, 10 + score) };
      });

      const selected = scoredDestinations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3); // Show the absolute top 3 matches

      // PHASE 3: Rendering & AI Reasoning
      destinationFeed.innerHTML = '';
      showView('results');

      selected.forEach(async (dest) => {
        const card = document.createElement('div');
        card.className = 'dest-card';
        
        const randomImg = dest.allPhotos && dest.allPhotos.length > 0 
          ? dest.allPhotos[Math.floor(Math.random() * dest.allPhotos.length)]
          : dest.image;

        // SerpApi Flight Integration (Placeholder for real API)
        const getFlightPrice = async (originState, destAirport) => {
          const stateToAirport = { 
            'Delhi': 'DEL', 'Maharashtra': 'BOM', 'Karnataka': 'BLR', 
            'Tamil Nadu': 'MAA', 'West Bengal': 'CCU', 'Telangana': 'HYD'
          };
          const fromCode = stateToAirport[originState] || 'DEL';
          
          // MOCK LOGIC (Calculates 'fair' price from India to World)
          const basePrices = { 
            'DEL': { 'CDG': 650, 'LHR': 700, 'BKK': 250, 'CPT': 900, 'JFK': 1100, 'INTL': 850 },
            'BOM': { 'CDG': 680, 'LHR': 720, 'BKK': 220, 'CPT': 850, 'JFK': 1150, 'INTL': 850 }
          };
          const price = (basePrices[fromCode] && basePrices[fromCode][destAirport]) || 850;
          return price;
        };

        const flightCost = await getFlightPrice(document.getElementById('origin-state').value, dest.airportCode);
        const stayCost = Math.round((dest.estimatedCost / 7) * duration);
        const dynamicCost = stayCost + flightCost;

        card.innerHTML = `
          <div class="dest-card-bg" style="background-image: url('${randomImg}')"></div>
          <div class="dest-card-overlay"></div>
          
          <div class="content-wrapper">
            <div class="match-badge">
              ✨ ${Math.floor(dest.matchScore)}% Match
            </div>
            <div class="dest-img-container" style="height: 250px;">
              <img src="${randomImg}" class="dest-img" alt="${dest.name}" 
                   onerror="this.src='https://images.unsplash.com/photo-1502791451862-7bd8c1df43a7?q=80&w=1000&auto=format&fit=crop'">
            </div>
            <div class="dest-info" style="padding: 2rem;">
              <h1 class="dest-title" style="font-size: 2.2rem;">${dest.name.split(',')[0]}</h1>
              <p class="dest-subtitle" style="font-size: 1rem; margin-bottom: 1rem;">${dest.description.substring(0, 70)}...</p>
              
              <div class="highlight-box" style="margin-bottom: 1.5rem; padding: 1rem; font-size: 0.9rem;">
                Perfect for a ${activeVibe} trip. Exceptional ${dest.vibe[0]} experiences await.
              </div>

              <div class="dest-metrics-row" style="margin-bottom: 1.5rem; gap: 1.5rem;">
                <div class="metric-col">
                  <span class="m-label">EST. COST</span>
                  <span class="m-val" style="font-size: 1.1rem;">$${dynamicCost}</span>
                </div>
                <div class="metric-col">
                  <span class="m-label">VIBE</span>
                  <span class="m-val" style="font-size: 1.1rem;">${dest.vibe[0].toUpperCase()}</span>
                </div>
              </div>

              <button class="lock-btn gen-plan-btn" data-dest-id="${dest.id}">
                Lock this trip →
              </button>
              
              <div id="ai-container-${dest.id}" class="ai-section"></div>
            </div>
          </div>
        `;
        destinationFeed.appendChild(card);

        // Add Event Listener to the new button
        const genBtn = card.querySelector('.gen-plan-btn');
        genBtn.addEventListener('click', async () => {
          const container = document.getElementById(`ai-container-${dest.id}`);
          genBtn.style.display = 'none'; // Hide the button once clicked
          
          container.innerHTML = `
            <div class="reasoning-card">
              <div class="r-title">✨ Thinking like a local...</div>
              <div class="loader" style="margin: 0 auto;"></div>
            </div>
          `;

          const finalPrompt = `The user is planning a trip for a ${activeGroup} with a ${activeVibe} vibe. 
          Preferences: Activity level ${energyVal}/100, Budget level ${budgetVal}/100.
          Why is ${dest.name} a perfect match for this ${activeGroup} trip? 
          Also provide a ${duration}-day itinerary.
          
          REQUIREMENTS: 
          1. Return 4 short bullet points for "why_this_wins".
          2. Return a "why_not_others" section mentioning two alternative cities (pick from the database) and why they are less ideal for THIS specific user.
          
          Format as JSON: { 
            "reasoning": "short intro", 
            "why_this_wins": ["point 1", "point 2", "point 3", "point 4"],
            "why_not_others": [{"name": "Alt City 1", "reason": "..."}, {"name": "Alt City 2", "reason": "..."}],
            "itinerary": [{ "day": 1, "title": "...", "desc": "..." }] 
          }`;

          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: finalPrompt }],
                response_format: { type: "json_object" }
              })
            });
            
            const data = await res.json();
            const plan = JSON.parse(data.choices[0].message.content);

            container.innerHTML = `
              <div class="reasoning-card">
                <div class="r-title">🌟 Why this wins</div>
                <ul class="r-list">
                  ${plan.why_this_wins.map(point => `
                    <li class="r-item">
                      <span class="r-check">✓</span>
                      <span>${point}</span>
                    </li>
                  `).join('')}
                </ul>

                <div class="not-others">
                  <div class="others-title">🧐 Why not the others</div>
                  ${plan.why_not_others.map(alt => `
                    <div class="other-dest-mini">
                      <div class="other-name">${alt.name}</div>
                      <div class="other-reason">${alt.reason}</div>
                    </div>
                  `).join('')}
                </div>

                <div class="itinerary-grid">
                  <div class="others-title">📅 Your ${duration}-Day Journey</div>
                  ${plan.itinerary.map(day => `
                    <div class="itinerary-day">
                      <span class="day-tag">Day ${day.day}</span>
                      <div class="day-title">${day.title}</div>
                      <div class="day-desc">${day.desc}</div>
                    </div>
                  `).join('')}
                </div>
                
                <button class="lock-btn" style="margin-top: 2rem; background: #2d3436;">
                  Save this Journey
                </button>
              </div>
            `;
          } catch (err) {
            console.error("AI Error:", err);
            container.innerHTML = `<p style="color: var(--primary)">Error generating plan. Please try again.</p>`;
            genBtn.style.display = 'block';
          }
        });

        // Image Fallback
        const img = new Image();
        img.src = dest.image;
        img.onerror = () => { card.style.backgroundImage = `url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000')`; };
      });

    } catch (err) {
      console.error("AI Flow Error:", err);
      alert("AI is having a moment. Please try again.");
    } finally {
      btnText.classList.remove('hidden');
      loader.classList.add('hidden');
      generateBtn.disabled = false;
    }
  });

  // --- Results Generation ---
  const destinationFeed = document.getElementById('destination-feed');
  
  function generateResults() {
    destinationFeed.innerHTML = '';
    
    const promptText = document.getElementById('intent-prompt').value.toLowerCase();
    const energyVal = document.getElementById('vibe-energy').value; // 0-100
    const popVal = document.getElementById('vibe-popularity') ? document.getElementById('vibe-popularity').value : 50; // 0-100
    const styleVal = document.getElementById('vibe-style') ? document.getElementById('vibe-style').value : 50; // 0-100
    const budgetVal = document.getElementById('vibe-budget').value; // 0-100
    const duration = document.getElementById('trip-duration').value || 3;

    // Scoring logic
    const airportMap = {
      'Paris': 'CDG', 'London': 'LHR', 'Venice': 'VCE', 'Manhattan': 'JFK', 'Cape Town': 'CPT',
      'Las Vegas': 'LAS', 'Rome': 'FCO', 'Maldives': 'MLE', 'Hawaii': 'HNL', 'Monaco': 'NCE',
      'Grand Canyon': 'PHX', 'Hong Kong': 'HKG', 'Banff': 'YYC', 'Rio De Janeiro': 'GIG',
      'Bangkok': 'BKK', 'Tokyo': 'HND', 'Sydney': 'SYD', 'Zermatt': 'GVA', 'Dubai': 'DXB',
      'Barcelona': 'BCN', 'Amsterdam': 'AMS', 'Bali': 'DPS', 'Santorini': 'JTR'
    };

    const mockDestinations = d.map(dest => ({
      ...dest,
      airportCode: airportMap[dest.city] || 'INTL'
    }));

    const scoredDestinations = mockDestinations.map(dest => {
      let score = 0;
      
      // 1. Text Prompt Matching (Simple Keyword matching)
      const keywords = ['beach', 'mountain', 'hiking', 'trekking', 'city', 'urban', 'culture', 'history', 'safari', 'nature', 'desert', 'diving', 'temple', 'relax', 'adventure'];
      keywords.forEach(word => {
        if (promptText.includes(word) && (dest.description.toLowerCase().includes(word) || dest.vibe.includes(word))) {
          score += 15;
        }
      });

      // 2. Energy Score (0 = Chill, 100 = High Energy)
      // dest.vibe mapping: 'chill' is low energy, 'high_energy' or 'adventure' is high
      if (energyVal > 60) {
        if (dest.vibe.includes('high_energy') || dest.vibe.includes('adventure')) score += 15;
      } else if (energyVal < 40) {
        if (dest.vibe.includes('chill')) score += 15;
      }

      // 3. Style & Popularity Score
      if (popVal > 60 && dest.budgetTier === '$$$') score += 10;
      else if (popVal < 40 && dest.budgetTier === '$') score += 10;
      if (styleVal > 60 && (dest.vibe.includes('city') || dest.description.toLowerCase().includes('modern'))) score += 10;
      else if (styleVal < 40 && (dest.vibe.includes('culture') || dest.description.toLowerCase().includes('historic') || dest.description.toLowerCase().includes('old'))) score += 10;

      // 4. Budget Score (0 = Budget, 100 = Luxury)
      const tierMap = { '$': 20, '$$': 50, '$$$': 80 };
      const destBudgetVal = tierMap[dest.budgetTier] || 50;
      const budgetDiff = Math.abs(budgetVal - destBudgetVal);
      score += Math.max(0, 20 - (budgetDiff / 2.5)); // Max 20 points for budget match

      return { ...dest, matchScore: Math.min(99, 70 + (score / 2.5)) }; // Baseline 70% match
    });

    // Sort by match score and pick top 5
    const selected = scoredDestinations
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);
    
    selected.forEach(dest => {
      const card = document.createElement('div');
      card.className = 'dest-card';
      card.style.backgroundImage = `url('${dest.image}')`;
      
      card.innerHTML = `
        <div class="dest-overlay"></div>
        <div class="dest-content">
          <div class="dest-tags">
            ${dest.vibe.slice(0,3).map(t => `<span class="tag">${t}</span>`).join('')}
            <span class="tag">${dest.budgetTier}</span>
          </div>
          <h1 class="dest-title">${dest.name}</h1>
          <p class="dest-desc">${dest.description}</p>
          
          <div class="metrics">
            <div class="metric-item">
              <span class="metric-label">Est. Budget</span>
              <span class="metric-value">$${dest.estimatedCost}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Match Score</span>
              <span class="metric-value">${Math.floor(dest.matchScore)}%</span>
            </div>
          </div>

          <div class="itinerary-container" id="itinerary-${dest.id}">
            <button class="btn primary-btn gen-itin-btn" data-dest-id="${dest.id}">
              Generate AI Plan
            </button>
          </div>
        </div>
      `;
      
      destinationFeed.appendChild(card);

      // Event listener for the "Generate AI Plan" button
      const genBtn = card.querySelector('.gen-itin-btn');
      genBtn.addEventListener('click', async () => {
        const itinContainer = document.getElementById(`itinerary-${dest.id}`);
        itinContainer.innerHTML = `
          <div class="brain-box">
            <span class="reasoning-label">Voyage AI Brain</span>
            <p class="reasoning-text">Analyzing ${dest.name} for your vibe...</p>
            <div class="loader" style="margin-top: 10px;"></div>
          </div>
          <div class="itinerary-display"></div>
        `;

        const GROQ_API_KEY = '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';
        const finalPrompt = `You are a travel expert. Generate a ${duration}-day itinerary for ${dest.name}.
        User Vibe: ${promptText}.
        Format as JSON with 'reasoning' (1 sentence why it matches) and 'itinerary' (array of objects with day, title, desc).
        JSON only.`;

        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [{ role: 'user', content: finalPrompt }],
              response_format: { type: "json_object" }
            })
          });
          const data = await res.json();
          const result = JSON.parse(data.choices[0].message.content);

          itinContainer.querySelector('.reasoning-text').textContent = result.reasoning;
          itinContainer.querySelector('.loader').classList.add('hidden');
          
          const display = itinContainer.querySelector('.itinerary-display');
          display.innerHTML = `
            <h3 class="itinerary-title">Personalized Itinerary</h3>
            ${result.itinerary.map(day => `
              <div class="itinerary-day">
                <div class="day-header">Day ${day.day}</div>
                <div class="day-title">${day.title}</div>
                <div class="day-desc">${day.desc}</div>
              </div>
            `).join('')}
            <button class="save-trip-btn" id="save-${dest.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save to My Trips
            </button>
          `;

          // Handle Save Trip
          display.querySelector('.save-trip-btn').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.innerHTML = 'Saving...';
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              alert("Please log in to save trips.");
              btn.innerHTML = 'Save to My Trips';
              return;
            }

            const { error } = await supabase.from('itineraries').insert({
              user_id: user.id,
              destination: dest.name,
              itinerary_data: result.itinerary,
              reasoning: result.reasoning,
              duration: duration
            });

            if (error) {
              console.error("Save Error:", error);
              alert("Error saving trip. Check if 'itineraries' table exists in Supabase.");
              btn.innerHTML = 'Save to My Trips';
            } else {
              btn.classList.add('saved');
              btn.innerHTML = '✓ Saved to Trips';
            }
          });

        } catch (err) {
          console.error("AI Error:", err);
          itinContainer.innerHTML = `<p style="color: var(--primary)">Error generating plan. Please try again.</p>`;
        }
      });

      // --- Image Fallback Logic ---
      const img = new Image();
      img.src = dest.image;
      img.onerror = () => {
        card.style.backgroundImage = `url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000')`;
      };
    });
  }

  // Back button from results
  document.getElementById('back-to-intent-btn').addEventListener('click', () => {
    showView('intent');
  });

});
