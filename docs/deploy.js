(function () {
  var SUPABASE_URL = 'https://xcvbeyntfgjfyifyicha.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_DZIaADi3MLC5yPKv8bLKag_CFUGSSyw';
  var DEFAULT_CITY = { name: '\u53a6\u95e8\u5e02', regionId: 'b0000000-0000-0000-0000-000000000011', province: '\u798f\u5efa\u7701' };
  var PROFILE_KEY = 'baypier-demo-profile';
  var CITY_TREE = {
    '\u6d59\u6c5f\u7701': [
      { name: '\u676d\u5dde\u5e02', regionId: 'b0000000-0000-0000-0000-000000000001' }
    ],
    '\u5e7f\u4e1c\u7701': [
      { name: '\u6df1\u5733\u5e02', regionId: 'b0000000-0000-0000-0000-000000000003' }
    ],
    '\u4e0a\u6d77\u5e02': [
      { name: '\u4e0a\u6d77\u5e02', regionId: 'a0000000-0000-0000-0000-000000000006' }
    ],
    '\u798f\u5efa\u7701': [
      { name: '\u53a6\u95e8\u5e02', regionId: 'b0000000-0000-0000-0000-000000000011' }
    ]
  };

  function qs(selector, root) { return (root || document).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function textOf(el) { return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function params() { return new URLSearchParams(window.location.search); }
  function go(url) { window.location.href = url; }
  function setText(selector, value) { var el = qs(selector); if (el) el.textContent = value; }
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function showFeedback(message, isError) {
    var el = qs('#search-feedback');
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('hidden');
    el.style.color = isError ? '#ba1a1a' : '';
  }
  function saveProfile(profile) {
    try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile || {})); } catch (e) {}
  }
  function loadProfile() {
    try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function api(path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Accept: 'application/json'
      }
    }).then(function (res) {
      if (!res.ok) throw new Error('API ' + res.status + ': ' + path);
      return res.json();
    });
  }
  function fetchPoliciesByRegion(regionId) {
    return api('v_policies?select=*&region_id=eq.' + encodeURIComponent(regionId) + '&status=eq.active&order=subsidy_amount_max.desc');
  }
  function fetchPolicyDetail(id) {
    var select = encodeURIComponent('*,regions(name,full_path),policy_eligibility_rules(rule_field,operator,value,is_required),policy_tags(tag)');
    return api('policies?select=' + select + '&id=eq.' + encodeURIComponent(id)).then(function (rows) { return rows && rows[0] ? rows[0] : null; });
  }
  function typeLabel(type) {
    var map = {
      living_subsidy: '\u751f\u6d3b\u8865\u8d34',
      rental_subsidy: '\u79df\u623f\u8865\u8d34',
      housing_subsidy: '\u8d2d\u623f\u8865\u8d34',
      settling_allowance: '\u5b89\u5bb6\u8865\u8d34',
      talent_introduction: '\u4eba\u624d\u5f15\u8fdb',
      employment_subsidy: '\u5c31\u4e1a\u8865\u8d34',
      entrepreneurship: '\u521b\u4e1a\u6276\u6301',
      social_insurance: '\u793e\u4fdd\u8865\u8d34',
      skill_training: '\u6280\u80fd\u57f9\u8bad',
      public_rental: '\u516c\u79df\u623f',
      other: '\u5176\u4ed6\u653f\u7b56'
    };
    return map[type] || '\u653f\u7b56';
  }
  function ruleFieldLabel(field) {
    var map = {
      degree: '\u5b66\u5386\u8981\u6c42',
      graduation_year: '\u6bd5\u4e1a\u5e74\u4efd',
      school_tier: '\u9662\u6821\u5c42\u6b21',
      employment_status: '\u5c31\u4e1a\u72b6\u6001',
      has_social_insurance: '\u793e\u4fdd\u8981\u6c42',
      hukou_type: '\u6237\u53e3\u7c7b\u578b'
    };
    return map[field] || field || '\u7533\u8bf7\u6761\u4ef6';
  }
  function moneyText(item) {
    if (item.subsidy_amount_desc) return item.subsidy_amount_desc;
    if (item.subsidy_amount_max) return '\u6700\u9ad8 ' + item.subsidy_amount_max.toLocaleString('zh-CN') + ' \u5143';
    return '\u8bf7\u4ee5\u5b98\u65b9\u8bf4\u660e\u4e3a\u51c6';
  }
  function setHomeLabels() {
    var gender = qs('#gender-input');
    var birthday = qs('#birthday-input');
    var location = qs('#location-select');
    var degree = qs('#degree-input');
    var school = qs('#school-input');
    var major = qs('#major-input');
    var exp = qs('#experience-input');
    var helper = qs('#location-helper');
    if (gender && gender.previousElementSibling) gender.previousElementSibling.textContent = '\u6027\u522b';
    if (birthday && birthday.previousElementSibling) birthday.previousElementSibling.textContent = '\u751f\u65e5';
    if (location && location.previousElementSibling) location.previousElementSibling.textContent = '\u76ee\u6807\u57ce\u5e02';
    if (degree && degree.previousElementSibling) degree.previousElementSibling.textContent = '\u5b66\u5386';
    if (school && school.previousElementSibling) school.previousElementSibling.textContent = '\u5c31\u8bfb\u5b66\u6821';
    if (major && major.previousElementSibling) major.previousElementSibling.textContent = '\u4e13\u4e1a';
    if (exp && exp.previousElementSibling) exp.previousElementSibling.textContent = '\u5176\u4ed6\u91cd\u8981\u5c65\u5386';
    if (gender) gender.innerHTML = '<option>\u8bf7\u9009\u62e9</option><option>\u7537</option><option>\u5973</option><option>\u5176\u4ed6</option>';
    if (degree) degree.innerHTML = '<option>\u8bf7\u9009\u62e9</option><option>\u672c\u79d1</option><option>\u7855\u58eb</option><option>\u535a\u58eb</option><option>\u5927\u4e13\u53ca\u5176\u4ed6</option>';
    if (school) school.placeholder = '\u5b66\u6821\u5168\u79f0';
    if (major) major.placeholder = '\u6240\u5c5e\u5b66\u79d1\u95e8\u7c7b';
    if (exp) exp.placeholder = '\u8bf7\u7b80\u8981\u63cf\u8ff0\u60a8\u7684\u5b9e\u4e60\u7ecf\u5386\u3001\u79d1\u7814\u9879\u76ee\u6216\u83b7\u5956\u60c5\u51b5...';
    if (helper) helper.textContent = '\u8bf7\u5148\u9009\u7701\u4efd\uff0c\u518d\u5728\u540c\u4e00\u4e2a\u4e0b\u62c9\u6846\u4e2d\u9009\u57ce\u5e02';
    var button = qs('#search-form button[type="submit"]');
    if (button) button.innerHTML = '<span class="material-symbols-outlined" data-icon="search">search</span>\u5bfb\u627e\u201c\u767d\u6f02\u201d\u673a\u4f1a';
  }
  function currentFormProfile() {
    var locationEl = qs('#location-select');
    return {
      province: locationEl ? (locationEl.dataset.province || '') : '',
      city: locationEl ? (locationEl.dataset.cityName || '') : '',
      regionId: locationEl ? (locationEl.dataset.regionId || '') : '',
      degree: (qs('#degree-input') && qs('#degree-input').value || '').trim(),
      school: (qs('#school-input') && qs('#school-input').value || '').trim(),
      major: (qs('#major-input') && qs('#major-input').value || '').trim(),
      experience: (qs('#experience-input') && qs('#experience-input').value || '').trim()
    };
  }
  function renderLocationOptions(stage, province, selectedRegionId) {
    var select = qs('#location-select');
    if (!select) return;
    if (stage === 'province') {
      select.dataset.stage = 'province';
      select.dataset.province = '';
      select.dataset.cityName = '';
      select.dataset.regionId = '';
      select.innerHTML = '<option value="">\u8bf7\u9009\u62e9\u7701\u4efd</option>' + Object.keys(CITY_TREE).map(function (item) {
        return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>';
      }).join('');
      select.value = province || '';
      return;
    }
    var cities = CITY_TREE[province] || [];
    select.dataset.stage = 'city';
    select.dataset.province = province || '';
    select.dataset.cityName = '';
    select.dataset.regionId = '';
    select.innerHTML = '<option value="">\u8bf7\u9009\u62e9\u57ce\u5e02</option><option value="__back__">\u2190 \u8fd4\u56de\u91cd\u9009\u7701\u4efd</option>' + cities.map(function (item) {
      var selected = selectedRegionId === item.regionId ? ' selected' : '';
      return '<option value="' + escapeHtml(item.regionId) + '" data-city="' + escapeHtml(item.name) + '"' + selected + '>' + escapeHtml(item.name) + '</option>';
    }).join('');
    if (selectedRegionId) {
      var opt = select.querySelector('option[value="' + selectedRegionId + '"]');
      if (opt) {
        select.dataset.cityName = opt.textContent;
        select.dataset.regionId = selectedRegionId;
      }
    }
  }
  function initLocationSelector() {
    var select = qs('#location-select');
    if (!select) return;
    renderLocationOptions('province', '', '');
    select.addEventListener('change', function () {
      if (select.dataset.stage === 'province') {
        if (!select.value) return;
        renderLocationOptions('city', select.value, '');
        return;
      }
      if (select.value === '__back__') {
        renderLocationOptions('province', '', '');
        return;
      }
      var opt = select.options[select.selectedIndex];
      select.dataset.cityName = opt ? opt.textContent : '';
      select.dataset.regionId = select.value || '';
    });
    var saved = loadProfile();
    if (saved.province && saved.regionId && CITY_TREE[saved.province]) {
      renderLocationOptions('city', saved.province, saved.regionId);
    }
  }
  function buildPolicyCard(item, index) {
    var tagClass = item.verified ? 'bg-green-100 text-green-700' : ((item.confidence_score || 0) >= 0.7 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700');
    var tagText = item.verified ? '\u5df2\u6838\u9a8c' : ((item.confidence_score || 0) >= 0.7 ? '\u9ad8\u5339\u914d' : '\u5f85\u6838\u9a8c');
    var score = Math.max(60, Math.min(99, Math.round((item.subsidy_amount_max || 0) / 2000) + (item.verified ? 20 : 8) + 50 - index));
    return [
      '<article class="relative overflow-hidden bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(0,95,156,0.06)] flex flex-col md:flex-row gap-6 items-start">',
      '<div class="match-tag ' + tagClass + '">' + escapeHtml(tagText) + '</div>',
      '<div class="flex-1">',
      '<div class="flex items-center gap-3 mb-4">',
      '<span class="bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">' + escapeHtml(typeLabel(item.type)) + '</span>',
      '<span class="text-primary font-bold text-sm">' + score + '% \u5339\u914d\u5ea6</span>',
      '</div>',
      '<h2 class="font-headline text-2xl font-bold text-on-surface mb-2">' + escapeHtml(item.title) + '</h2>',
      '<p class="text-on-surface-variant mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-primary-container">check_circle</span>' + escapeHtml(item.eligibility_summary || item.summary || '\u70b9\u51fb\u67e5\u770b\u8be6\u60c5\u4e0e\u7533\u8bf7\u6761\u4ef6\u3002') + '</p>',
      '<div class="flex items-center gap-8 flex-wrap">',
      '<div><p class="font-label text-[10px] uppercase tracking-widest text-outline mb-1">\u8865\u8d34\u4fe1\u606f</p><p class="text-3xl font-black text-primary tracking-tight font-headline">' + escapeHtml(moneyText(item)) + '</p></div>',
      '<div class="h-10 w-px bg-outline-variant/20"></div>',
      '<div><p class="font-label text-[10px] uppercase tracking-widest text-outline mb-1">\u9002\u7528\u57ce\u5e02</p><p class="text-lg font-bold">' + escapeHtml(item.region_name || '') + '</p></div>',
      '</div>',
      '</div>',
      '<div class="w-full md:w-auto self-end"><a class="w-full md:w-auto bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-bold shadow-[0_10px_20px_rgba(0,95,156,0.15)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2" href="policy.html?id=' + encodeURIComponent(item.id || item.policy_id) + '">\u67e5\u770b\u8be6\u60c5<span class="material-symbols-outlined text-lg">arrow_forward</span></a></div>',
      '</article>'
    ].join('');
  }
  function buildEmptyState(cityName) {
    return '<article class="bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(0,95,156,0.06)]"><h2 class="font-headline text-2xl font-bold text-on-surface mb-3">\u6682\u65e0\u53ef\u5c55\u793a\u653f\u7b56</h2><p class="text-on-surface-variant leading-relaxed">\u5f53\u524d\u672a\u68c0\u7d22\u5230\u201c' + escapeHtml(cityName) + '\u201d\u7684 active \u653f\u7b56\u6570\u636e\u3002</p></article>';
  }
  function submitHomeSearch(profile) {
    if (!profile.regionId) {
      profile.province = DEFAULT_CITY.province;
      profile.city = DEFAULT_CITY.name;
      profile.regionId = DEFAULT_CITY.regionId;
    }
    saveProfile(profile);
    var next = 'match.html?city=' + encodeURIComponent(profile.city) + '&regionId=' + encodeURIComponent(profile.regionId) + '&province=' + encodeURIComponent(profile.province);
    if (profile.degree) next += '&degree=' + encodeURIComponent(profile.degree);
    if (profile.school) next += '&school=' + encodeURIComponent(profile.school);
    if (profile.major) next += '&major=' + encodeURIComponent(profile.major);
    go(next);
  }
  function setupHome() {
    var form = qs('#search-form');
    if (!form) return;
    setHomeLabels();
    initLocationSelector();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitHomeSearch(currentFormProfile());
    });
  }
  function setupMatch() {
    if (!qs('#results-list')) return;
    var p = params();
    var profile = loadProfile();
    var regionId = p.get('regionId') || profile.regionId || DEFAULT_CITY.regionId;
    var cityName = p.get('city') || profile.city || DEFAULT_CITY.name;
    fetchPoliciesByRegion(regionId).then(function (policies) {
      setText('#results-title', '\u4e3a\u60a8\u627e\u5230 ' + policies.length + ' \u9879\u653f\u7b56');
      setText('#results-subtitle', '\u5f53\u524d\u5c55\u793a\u201c' + cityName + '\u201d\u7684 active \u653f\u7b56\u6570\u636e\u3002');
      var summary = qs('#profile-summary');
      if (summary) {
        summary.innerHTML = [
          '<div class="flex items-center gap-2 text-sm font-semibold"><span class="material-symbols-outlined text-primary text-lg">school</span>' + escapeHtml((p.get('degree') || profile.degree || '\u672a\u586b\u5199\u5b66\u5386') + ' / ' + (p.get('school') || profile.school || '\u672a\u586b\u5199\u5b66\u6821')) + '</div>',
          '<div class="flex items-center gap-2 text-sm font-semibold"><span class="material-symbols-outlined text-primary text-lg">location_on</span>' + escapeHtml(cityName) + '</div>',
          '<div class="flex items-center gap-2 text-sm font-semibold"><span class="material-symbols-outlined text-primary text-lg">category</span>' + escapeHtml(p.get('major') || profile.major || '\u672a\u586b\u5199\u4e13\u4e1a') + '</div>'
        ].join('');
      }
      qs('#results-list').innerHTML = policies.length ? policies.map(buildPolicyCard).join('') : buildEmptyState(cityName);
    }).catch(function (err) {
      console.error(err);
      qs('#results-list').innerHTML = buildEmptyState(cityName);
      setText('#results-title', '\u52a0\u8f7d\u7ed3\u679c\u5931\u8d25');
      setText('#results-subtitle', '\u8bf7\u8fd4\u56de\u9996\u9875\u91cd\u65b0\u9009\u62e9\u57ce\u5e02\u3002');
    });
  }
  function renderRules(rules) {
    if (!rules || !rules.length) {
      return '<li class="flex items-start gap-4 p-4 rounded-xl hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-primary mt-1">check_circle</span><div><p class="font-bold text-on-surface">\u7533\u8bf7\u6761\u4ef6</p><p class="text-on-surface-variant text-sm mt-1">\u8bf7\u4ee5\u5b98\u65b9\u9875\u9762\u7684\u5b8c\u6574\u8bf4\u660e\u4e3a\u51c6\u3002</p></div></li>';
    }
    return rules.map(function (rule) {
      var value = Array.isArray(rule.value) ? rule.value.join(', ') : (typeof rule.value === 'object' ? JSON.stringify(rule.value) : String(rule.value));
      return '<li class="flex items-start gap-4 p-4 rounded-xl hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-primary mt-1">check_circle</span><div><p class="font-bold text-on-surface">' + escapeHtml(ruleFieldLabel(rule.rule_field)) + '</p><p class="text-on-surface-variant text-sm mt-1">' + escapeHtml(value) + '</p></div></li>';
    }).join('');
  }
  function renderApplication(methodText) {
    var steps = String(methodText || '\u8bf7\u67e5\u770b\u5b98\u65b9\u9875\u9762\u4e86\u89e3\u529e\u7406\u6d41\u7a0b\u3002')
      .split(/[.;\n]/)
      .map(function (item) { return item.trim(); })
      .filter(Boolean)
      .slice(0, 3);
    if (!steps.length) steps = ['\u8bf7\u67e5\u770b\u5b98\u65b9\u9875\u9762\u4e86\u89e3\u529e\u7406\u6d41\u7a0b\u3002'];
    return steps.map(function (item, index) {
      var tail = index < steps.length - 1 ? '<div class="absolute left-5 top-10 w-0.5 h-16 bg-outline-variant/30"></div>' : '';
      return '<div class="relative flex items-center gap-6">' + tail + '<div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold z-10">' + (index + 1) + '</div><div class="flex-grow bg-surface-container-low p-6 rounded-2xl border border-sky-50"><h4 class="font-bold mb-2">\u6b65\u9aa4 ' + (index + 1) + '</h4><p class="text-sm text-on-surface-variant">' + escapeHtml(item) + '</p></div></div>';
    }).join('');
  }
  function renderMaterials(policy) {
    var tags = (policy.policy_tags || []).map(function (item) { return item.tag; }).filter(Boolean);
    var items = [];
    if (policy.official_url) items.push('\u5b98\u65b9\u7533\u8bf7\u94fe\u63a5');
    if (policy.type) items.push(typeLabel(policy.type));
    tags.forEach(function (tag) { items.push(tag); });
    if (!items.length) items = ['\u8bf7\u53c2\u8003\u5b98\u65b9\u9875\u9762\u7684\u6750\u6599\u8981\u6c42'];
    return items.slice(0, 4).map(function (item) {
      return '<div class="bg-white/60 p-4 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-white transition-all"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-slate-400">description</span><span class="text-sm font-medium">' + escapeHtml(item) + '</span></div><span class="material-symbols-outlined text-primary opacity-0 group-hover:opacity-100 transition-opacity">open_in_new</span></div>';
    }).join('');
  }
  function setupPolicy() {
    if (!qs('#policy-title')) return;
    var id = params().get('id');
    if (!id) return;
    fetchPolicyDetail(id).then(function (policy) {
      if (!policy) throw new Error('policy not found');
      var region = policy.regions || {};
      setText('#policy-title', policy.title || '\u653f\u7b56\u8be6\u60c5');
      setText('#policy-authority', '\u9002\u7528\u5730\u533a\uff1a' + (region.name || '\u672a\u77e5') + (policy.verified ? ' \u00b7 \u5df2\u6838\u9a8c' : ' \u00b7 \u5f85\u6838\u9a8c'));
      setText('#policy-expiry', '\u65f6\u9650\u8bf4\u660e\uff1a' + (policy.time_limit_desc || '\u8bf7\u4ee5\u5b98\u65b9\u9875\u9762\u4e3a\u51c6'));
      setText('#policy-summary', policy.summary || policy.eligibility_summary || '\u8bf7\u53c2\u8003\u5b98\u65b9\u9875\u9762\u4e86\u89e3\u5b8c\u6574\u4fe1\u606f\u3002');
      setText('#policy-note', policy.content || '\u672c\u9875\u5c55\u793a\u7684\u662f Supabase \u4e2d\u7684\u7ed3\u6784\u5316\u653f\u7b56\u6570\u636e\uff0c\u6700\u7ec8\u4ee5\u5b98\u65b9\u9875\u9762\u548c\u4e3b\u7ba1\u90e8\u95e8\u5ba1\u6838\u4e3a\u51c6\u3002');
      var link = qs('#policy-official-link');
      if (link) {
        link.href = policy.official_url || '#';
        if (policy.official_url) {
          link.target = '_blank';
          link.rel = 'noreferrer noopener';
        }
      }
      if (qs('#policy-rules')) qs('#policy-rules').innerHTML = renderRules(policy.policy_eligibility_rules || []);
      if (qs('#policy-application')) qs('#policy-application').innerHTML = renderApplication(policy.application_method);
      if (qs('#policy-materials')) qs('#policy-materials').innerHTML = renderMaterials(policy);
    }).catch(function (err) {
      console.error(err);
      setText('#policy-title', '\u653f\u7b56\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25');
      setText('#policy-summary', '\u8bf7\u8fd4\u56de\u7ed3\u679c\u9875\u91cd\u8bd5\u3002');
      setText('#policy-note', 'Supabase \u8be6\u60c5\u67e5\u8be2\u5931\u8d25\u3002');
    });
  }

  function setupResumeUpload() {
    var input = qs('#resume-upload');
    if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var title = input.parentElement && input.parentElement.querySelector('h3');
      var desc = input.parentElement && input.parentElement.querySelector('p');
      if (title) title.textContent = '已选择简历';
      if (desc) desc.textContent = file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB';
    });
  }
  function wireStaticNav() {
    qsa('a[href="#"]').forEach(function (link) {
      var text = textOf(link).toLowerCase();
      var iconEl = qs('.material-symbols-outlined', link);
      var icon = textOf(iconEl).toLowerCase();
      if (text.indexOf('home') !== -1 || text.indexOf('\u9996\u9875') !== -1 || icon === 'home') link.href = 'index.html';
      else if (text.indexOf('polic') !== -1 || text.indexOf('\u653f\u7b56') !== -1 || icon === 'description') link.href = 'match.html';
      else if (text.indexOf('profile') !== -1 || text.indexOf('\u4e2a\u4eba') !== -1 || text.indexOf('\u6211\u7684') !== -1 || icon === 'person') link.href = 'resume.html';
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    try { wireStaticNav(); } catch (err) { console.error(err); }
    try { setupHome(); } catch (err) { console.error(err); }
    try { setupResumeUpload(); } catch (err) { console.error(err); }
    try { setupMatch(); } catch (err) { console.error(err); }
    try { setupPolicy(); } catch (err) { console.error(err); }
  });
})();
