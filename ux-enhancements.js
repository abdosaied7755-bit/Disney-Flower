/**
 * UX Enhancements Script
 * سكريبت تحسينات تجربة المستخدم
 * 
 * ⚠️ IMPORTANT: هذا الملف يجب أن يُحمّل بعد pwa-installer.js
 * يتم تحميله بعده لتجنب أي تضارع مع معالجات الأحداث
 */

(function() {
  'use strict';

  // تجاهل إذا كان DOM في بداية التحميل
  if (document.readyState === 'loading') {
    // انتظر قليلاً للسماح بتهيئة جميع الأحداث الأخرى أولاً
    document.addEventListener('DOMContentLoaded', initEnhancements);
  } else {
    // DOM جاهز بالفعل
    setTimeout(initEnhancements, 100);
  }

  function initEnhancements() {
    console.log('🎨 UX Enhancements: Starting initialization');
    startEnhancements();
  }

  // ==========================================
  // 1. Reading Progress Bar
  // ==========================================
  function updateReadingProgress() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    
    const progressBar = document.getElementById('readingProgress');
    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress / 100})`;
    }
  }

  // ==========================================
  // 2. Active Section Detection
  // ==========================================
  function updateActiveSection() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    const quickNavDots = document.querySelectorAll('.quick-nav-dot');
    const breadcrumb = document.getElementById('currentSection');
    const breadcrumbNav = document.getElementById('breadcrumbNav');
    
    let currentSection = '';
    const scrollPosition = window.pageYOffset + 150;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = sectionId;
      }
    });

    // تحديث القائمة الرئيسية
    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + currentSection) {
        link.classList.add('active');
      }
    });

    // تحديث نقاط التنقل السريع
    quickNavDots.forEach(dot => {
      dot.classList.remove('active');
      if (dot.getAttribute('data-target') === currentSection) {
        dot.classList.add('active');
      }
    });

    // تحديث Breadcrumb
    if (breadcrumb && currentSection) {
      const sectionNames = {
        'home': 'الرئيسية',
        'online-games': 'الألعاب',
        'flash-deals': 'العروض',
        'reviews': 'التقييمات',
        'trust': 'الثقة والأمان',
        'wheel': 'جرب حظك',
        'loyalty': 'المكافآت',
        'share-earn': 'اربح معنا'
      };
      
      breadcrumb.textContent = sectionNames[currentSection] || 'الرئيسية';
      
      if (currentSection !== 'home' && breadcrumbNav) {
        breadcrumbNav.classList.add('show');
      } else if (breadcrumbNav) {
        breadcrumbNav.classList.remove('show');
      }
    }
  }

  // ==========================================
  // 3. Scroll Top Button
  // ==========================================
  function updateScrollTopButton() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (!scrollTopBtn) return;

    if (window.pageYOffset > 300) {
      scrollTopBtn.classList.add('show');
    } else {
      scrollTopBtn.classList.remove('show');
    }
  }

  // ==========================================
  // 4. Quick Navigation Dots Click
  // ==========================================
  function initQuickNavigation() {
    const quickNavDots = document.querySelectorAll('.quick-nav-dot');
    
    quickNavDots.forEach(dot => {
      dot.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
          targetSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ==========================================
  // 5. Intersection Observer للأنيميشنز
  // ==========================================
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-animate');
          currentObserver.unobserve(entry.target);
          
          // إضافة تأثيرات مختلفة للعناصر الفرعية
          const cards = entry.target.querySelectorAll('.game-card-premium, .deal-card, .payment-card-modern, .category-card, .product-card');
          cards.forEach((card, index) => {
            card.style.setProperty('--reveal-delay', `${Math.min(index * 60, 300)}ms`);
            card.classList.add('card-reveal');
          });
        }
      });
    }, observerOptions);

    // مراقبة جميع الأقسام
    document.querySelectorAll('section').forEach(section => {
      observer.observe(section);
    });

    // تهيئة العناصر
    document.querySelectorAll('.game-card-premium, .deal-card, .payment-card-modern, .category-card, .product-card').forEach(card => {
      card.classList.add('card-reveal-pending');
    });
  }

  // ==========================================
  // 6. Smooth Scroll للروابط
  // ==========================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '') return;
        
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ==========================================
  // 7. Performance Monitoring
  // ==========================================
  function monitorPerformance() {
    let ticking = false;
    
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          updateReadingProgress();
          updateScrollTopButton();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ==========================================
  // 8. Lazy Loading Images Enhancement
  // ==========================================
  function enhanceLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // ==========================================
  // 9. تحسين تجربة اللمس للموبايل
  // ==========================================
  function enhanceTouchExperience() {
    // Keep native touch scrolling uninterrupted; no document-level touch tracking.
  }

  // ==========================================
  // 10. تحسين Accessibility
  // ==========================================
  function enhanceAccessibility() {
    // إضافة Skip to Content
    if (document.querySelector('.skip-to-content')) return;
    const skipLink = document.createElement('a');
    skipLink.href = document.getElementById('departments') ? '#departments' : (document.querySelector('main') ? '#'+(document.querySelector('main').id || 'main') : '#');
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'تخطي إلى المحتوى';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--disney-wine);
      color: var(--disney-cream);
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 0 0 8px 0;
      z-index: 10000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', function() {
      this.style.top = '0';
    });
    
    skipLink.addEventListener('blur', function() {
      this.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);

    // تحسين ARIA labels
    document.querySelectorAll('section').forEach(section => {
      if (!section.getAttribute('aria-label')) {
        const heading = section.querySelector('h2');
        if (heading) {
          section.setAttribute('aria-label', heading.textContent);
        }
      }
    });
  }

  // ==========================================
  // 11. تحديث الوقت الفعلي
  // ==========================================
  function updateRealTimeElements() {
    // Let CSS animations run without forcing style recalculation on an interval.
  }

  // ==========================================
  // 12. Analytics & User Behavior
  // ==========================================
  function trackUserBehavior() {
    // Avoid layout reads and logging on every scroll; section visibility is already
    // handled by IntersectionObserver.
  }

  // ==========================================
  // التهيئة الرئيسية
  // ==========================================
  function init() {
    // انتظار تحميل DOM بالكامل
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startEnhancements);
    } else {
      startEnhancements();
    }
  }

  // ==========================================
  // Card image zoom
  // ==========================================
  function initCardImageZoom() {
    if (document.documentElement.dataset.cardImageZoomReady === 'true') return;
    document.documentElement.dataset.cardImageZoomReady = 'true';

    const lightbox = document.createElement('div');
    lightbox.className = 'card-image-lightbox';
    lightbox.setAttribute('aria-hidden', 'true');
    lightbox.setAttribute('inert', '');
    lightbox.innerHTML = `
      <div class="card-image-lightbox-dialog" role="dialog" aria-modal="true" aria-label="عرض صورة المنتج">
        <button class="card-image-lightbox-close" type="button" aria-label="إغلاق عرض الصورة" title="إغلاق">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
        <img class="card-image-lightbox-image" alt="" decoding="async">
        <p class="card-image-lightbox-caption"></p>
      </div>
    `;
    document.body.appendChild(lightbox);

    const preview = lightbox.querySelector('.card-image-lightbox-image');
    const caption = lightbox.querySelector('.card-image-lightbox-caption');
    const closeButton = lightbox.querySelector('.card-image-lightbox-close');
    let lastTrigger = null;

    const closeLightbox = () => {
      lightbox.setAttribute('inert', '');
      lightbox.classList.remove('is-open');
      document.body.classList.remove('image-lightbox-open');
      preview.removeAttribute('src');
      setTimeout(() => {
        lightbox.setAttribute('aria-hidden', 'true');
        if (lastTrigger) lastTrigger.focus({ preventScroll: true });
      }, 0);
    };

    const openLightbox = (source, trigger) => {
      if (!source) return;
      lastTrigger = trigger;
      preview.src = source.url;
      preview.alt = source.alt || 'صورة المنتج';
      caption.textContent = source.alt || '';
      lightbox.classList.add('is-open');
      lightbox.removeAttribute('inert');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('image-lightbox-open');
      closeButton.focus({ preventScroll: true });
    };

    const readBackgroundUrl = (element) => {
      const value = getComputedStyle(element).backgroundImage || element.style.backgroundImage || '';
      const match = value.match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*))\)/i);
      return match ? (match[1] || match[2] || match[3] || '').trim() : '';
    };

    const getSource = (target) => {
      const image = target.closest('.offer-card-media img, .memory-polaroid img');
      if (image) {
        return {
          url: image.currentSrc || image.src,
          alt: image.alt
        };
      }

      const surface = target.closest('.category-card-image, .product-card-image, .nested-category-card-image, .game-card-image');
      if (!surface) return null;
      const url = readBackgroundUrl(surface);
      if (!url || url === 'none') return null;
      const card = surface.closest('article, a, figure');
      const alt = surface.getAttribute('aria-label') || card?.querySelector('h3, h4, strong')?.textContent?.trim() || '';
      return { url, alt };
    };

    document.addEventListener('click', (event) => {
      if (event.target.closest('button, a, input, select, textarea')) return;
      const trigger = event.target.closest('.offer-card-media img, .memory-polaroid img, .category-card-image, .product-card-image, .nested-category-card-image, .game-card-image');
      if (!trigger) return;
      const source = getSource(event.target);
      if (source) {
        event.preventDefault();
        openLightbox(source, trigger);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
        closeLightbox();
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = event.target.closest('.offer-card-media img, .memory-polaroid img, .category-card-image, .product-card-image, .nested-category-card-image, .game-card-image');
      if (!trigger || event.target !== trigger) return;
      const source = getSource(trigger);
      if (source) {
        event.preventDefault();
        openLightbox(source, trigger);
      }
    });

    document.addEventListener('focusin', (event) => {
      const trigger = event.target.closest('.offer-card-media img, .memory-polaroid img, .category-card-image, .product-card-image, .nested-category-card-image, .game-card-image');
      if (!trigger || trigger.dataset.zoomReady === 'true') return;
      trigger.dataset.zoomReady = 'true';
      trigger.classList.add('card-image-zoom-target');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-label', 'تكبير الصورة');
    });

    document.querySelectorAll('.offer-card-media img, .memory-polaroid img, .category-card-image, .product-card-image, .nested-category-card-image, .game-card-image').forEach((trigger) => {
      trigger.classList.add('card-image-zoom-target');
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-label', 'تكبير الصورة');
    });

    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }
  function startEnhancements() {
    console.log('🚀 UX Enhancements initialized');
    
    initQuickNavigation();
    initSmoothScroll();
    initScrollAnimations();
    monitorPerformance();
    enhanceLazyLoading();
    enhanceTouchExperience();
    enhanceAccessibility();
    initCardImageZoom();
    updateRealTimeElements();
    trackUserBehavior();
    
    // تشغيل فوري للوظائف المهمة
    updateReadingProgress();
    updateActiveSection();
    updateScrollTopButton();
  }

  // بدء التهيئة بعد انتظار قصير لضمان تحميل جميع الملفات الأخرى
  setTimeout(init, 200);

})();
