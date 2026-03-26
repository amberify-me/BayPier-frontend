(function () {
  'use strict';

  var SUPABASE_URL = 'https://xcvbeyntfgjfyifyicha.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_DZIaADi3MLC5yPKv8bLKag_CFUGSSyw';

  // 全部城市 —— 平铺，不做省市联动（减少操作步骤）
  var CITIES = [
    { name: '厦门市', id: 'b0000000-0000-0000-0000-000000000011' },
    { name: '杭州市', id: 'b0000000-0000-0000-0000-000000000001' },
    { name: '深圳市', id: 'b0000000-0000-0000-0000-000000000003' },
    { name: '上海市', id: 'a0000000-0000-0000-0000-000000000006' },
    { name: '北京市', id: 'a0000000-0000-0000-0000-000000000007' },
    { name: '南京市', id: 'b0000000-0000-0000-0000-000000000006' },
    { name: '成都市', id: 'b0000000-0000-0000-0000-000000000005' },
    { name: '武汉市', id: 'b0000000-0000-0000-0000-000000000008' },
    { name: '长沙市', id: 'b0000000-0000-0000-0000-000000000009' },
    { name: '广州市', id: 'b0000000-0000-0000-0000-000000000004' },
    { name: '宁波市', id: 'b0000000-0000-0000-0000-000000000002' },
    { name: '苏州市', id: 'b0000000-0000-0000-0000-000000000007' },
    { name: '重庆市', id: 'b0000000-0000-0000-0000-000000000010' }
  ];
  var DEFAULT_CITY = CITIES[0]; // 厦门

  // ============================================
  // 工具
  // ============================================
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  function esc(v) {
    return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function go(url) { window.location.href = url; }
  function qp() { return new URLSearchParams(window.location.search); }

  function savedCity() {
    try {
      var c = JSON.parse(sessionStorage.getItem('bp_city') || 'null');
      if (c && c.id && c.name) return c;
    } catch (e) {}
    return null;
  }
  function saveCity(city) {
    try { sessionStorage.setItem('bp_city', JSON.stringify(city)); } catch (e) {}
  }
  function currentCity() {
    var p = qp();
    if (p.get('regionId')) {
      var c = { id: p.get('regionId'), name: p.get('city') || '未知' };
      saveCity(c);
      return c;
    }
    return savedCity() || DEFAULT_CITY;
  }

  var TYPE_LABELS = {
    living_subsidy:'生活补贴', rental_subsidy:'租房补贴', housing_subsidy:'购房补贴',
    settling_allowance:'安家补贴', talent_introduction:'人才引进', employment_subsidy:'就业补贴',
    entrepreneurship:'创业扶持', social_insurance:'社保补贴', skill_training:'技能培训',
    public_rental:'公租房', other:'其他'
  };
  var RULE_LABELS = {
    degree:'学历要求', graduation_year:'毕业年份', school_tier:'院校层次',
    employment_status:'就业状态', has_social_insurance:'社保要求', hukou_type:'户口类型'
  };
  function typeLabel(t) { return TYPE_LABELS[t] || '政策'; }
  function ruleLabel(f) { return RULE_LABELS[f] || f || '条件'; }
  function moneyText(p) {
    if (p.subsidy_amount_desc) return p.subsidy_amount_desc;
    if (p.subsidy_amount_max > 0) return '最高 ' + p.subsidy_amount_max.toLocaleString('zh-CN') + ' 元';
    return '详见官方说明';
  }

  // ============================================
  // Supabase API
  // ============================================
  function api(path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error('API error ' + r.status);
      return r.json();
    });
  }

  function fetchPolicies(regionId) {
    return api('policies?select=*,regions(name,full_path)&region_id=eq.' +
      encodeURIComponent(regionId) + '&status=eq.active&order=subsidy_amount_max.desc');
  }

  function fetchPolicy(id) {
    return api('policies?select=*,regions(name,full_path),policy_eligibility_rules(rule_field,operator,value,is_required),policy_tags(tag)&id=eq.' +
      encodeURIComponent(id));
  }

  // ============================================
  // 城市选择器组件（复用于多个页面）
  // ============================================
  function buildCitySelector(containerId, selected, onChange) {
    var el = $(containerId);
    if (!el) return;
    var html = '<select class="w-full bg-surface-container-high border-none rounded-xl px-4 py-3 text-on-surface font-semibold">';
    CITIES.forEach(function (c) {
      html += '<option value="' + esc(c.id) + '"' + (selected && selected.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    });
    html += '</select>';
    el.innerHTML = html;
    el.querySelector('select').addEventListener('change', function () {
      var idx = this.selectedIndex;
      var city = CITIES[idx];
      saveCity(city);
      onChange(city);
    });
  }

  // ============================================
  // 首页
  // ============================================
  function setupHome() {
    var form = $('#search-form');
    if (!form) return;

    // 城市选择器
    buildCitySelector('#city-selector', savedCity() || DEFAULT_CITY, function () {});

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sel = $('#city-selector select');
      var idx = sel ? sel.selectedIndex : 0;
      var city = CITIES[idx] || DEFAULT_CITY;
      saveCity(city);
      go('match.html?city=' + encodeURIComponent(city.name) + '&regionId=' + encodeURIComponent(city.id));
    });
  }

  // ============================================
  // 政策列表页
  // ============================================
  function setupMatch() {
    var list = $('#results-list');
    if (!list) return;

    var city = currentCity();

    // 城市选择器 — 切换后重新加载
    buildCitySelector('#city-selector', city, function (newCity) {
      go('match.html?city=' + encodeURIComponent(newCity.name) + '&regionId=' + encodeURIComponent(newCity.id));
    });

    loadPolicies(city);
  }

  function loadPolicies(city) {
    var list = $('#results-list');
    var title = $('#results-title');
    var subtitle = $('#results-subtitle');

    if (title) title.textContent = '正在查询「' + city.name + '」...';
    if (subtitle) subtitle.textContent = '';
    list.innerHTML = '<div class="text-center py-16 text-on-surface-variant"><p>加载中...</p></div>';

    fetchPolicies(city.id).then(function (policies) {
      if (title) title.textContent = '「' + city.name + '」共 ' + policies.length + ' 项政策';
      if (subtitle) subtitle.textContent = policies.length ? '以下为该城市所有有效的人才补贴政策。' : '';

      if (!policies.length) {
        list.innerHTML = '<div class="bg-surface-container-lowest p-8 rounded-xl text-center">' +
          '<span class="material-symbols-outlined text-5xl text-primary/20 mb-4 block">search_off</span>' +
          '<p class="text-on-surface-variant">「' + esc(city.name) + '」暂无有效政策数据。</p></div>';
        return;
      }

      list.innerHTML = policies.map(function (p) {
        var tag = p.verified ? '<span class="bg-green-100 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full">已核验</span>' :
          (p.confidence_score >= 0.7 ? '<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full">高置信</span>' :
          '<span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1 rounded-full">待核验</span>');

        return '<a href="policy.html?id=' + encodeURIComponent(p.id) + '" class="block bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-[0_4px_20px_rgba(0,95,156,0.06)] hover:shadow-[0_8px_30px_rgba(0,95,156,0.12)] transition-shadow no-underline text-on-surface mb-4">' +
          '<div class="flex items-center gap-3 mb-3 flex-wrap">' +
            '<span class="bg-secondary-container text-on-surface-variant text-[10px] font-bold px-3 py-1 rounded-full">' + esc(typeLabel(p.type)) + '</span>' +
            tag +
          '</div>' +
          '<h3 class="font-headline text-xl font-bold mb-2">' + esc(p.title) + '</h3>' +
          '<p class="text-on-surface-variant text-sm mb-4 line-clamp-2">' + esc(p.eligibility_summary || p.summary || '') + '</p>' +
          '<div class="flex items-center gap-6 flex-wrap">' +
            '<div><span class="text-[10px] uppercase tracking-wider text-outline block">补贴金额</span><span class="text-lg font-black text-primary font-headline">' + esc(moneyText(p)) + '</span></div>' +
            (p.time_limit_desc ? '<div><span class="text-[10px] uppercase tracking-wider text-outline block">时限</span><span class="text-sm font-bold">' + esc(p.time_limit_desc) + '</span></div>' : '') +
          '</div>' +
        '</a>';
      }).join('');
    }).catch(function (err) {
      console.error(err);
      if (title) title.textContent = '加载失败';
      list.innerHTML = '<div class="bg-surface-container-lowest p-8 rounded-xl"><p class="text-error">错误：' + esc(err.message) + '</p><p class="text-on-surface-variant mt-2">请刷新页面重试。</p></div>';
    });
  }

  // ============================================
  // 政策详情页
  // ============================================
  function setupPolicy() {
    var titleEl = $('#policy-title');
    if (!titleEl) return;

    var id = qp().get('id');
    if (!id) {
      titleEl.textContent = '缺少政策 ID，请从政策列表进入';
      return;
    }

    // 城市切换器
    buildCitySelector('#city-selector', currentCity(), function (newCity) {
      go('match.html?city=' + encodeURIComponent(newCity.name) + '&regionId=' + encodeURIComponent(newCity.id));
    });

    fetchPolicy(id).then(function (rows) {
      var p = rows && rows[0];
      if (!p) {
        titleEl.textContent = '政策不存在';
        return;
      }

      var region = p.regions || {};
      var rules = p.policy_eligibility_rules || [];
      var tags = (p.policy_tags || []).map(function (t) { return t.tag; }).filter(Boolean);

      // 标题
      titleEl.textContent = p.title;
      document.title = p.title + ' - 白漂 BayPier';

      // 标签栏
      var infoBar = $('#policy-info-bar');
      if (infoBar) {
        infoBar.innerHTML =
          '<span class="flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-lg text-sm"><span class="material-symbols-outlined text-primary text-base">location_on</span>' + esc(region.name || '未知') + '</span>' +
          '<span class="flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-lg text-sm"><span class="material-symbols-outlined text-primary text-base">category</span>' + esc(typeLabel(p.type)) + '</span>' +
          (p.time_limit_desc ? '<span class="flex items-center gap-1 bg-surface-container-low px-3 py-1.5 rounded-lg text-sm"><span class="material-symbols-outlined text-primary text-base">schedule</span>' + esc(p.time_limit_desc) + '</span>' : '') +
          (p.verified ? '<span class="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-semibold"><span class="material-symbols-outlined text-base">verified</span>已核验</span>' : '');
      }

      // 金额
      var moneyEl = $('#policy-money');
      if (moneyEl) moneyEl.textContent = moneyText(p);

      // 官方链接
      var linkEl = $('#policy-link');
      if (linkEl) {
        if (p.official_url) {
          linkEl.href = p.official_url;
          linkEl.target = '_blank';
          linkEl.style.display = '';
        } else {
          linkEl.style.display = 'none';
        }
      }

      // 申报条件
      var rulesEl = $('#policy-rules');
      if (rulesEl) {
        if (rules.length) {
          rulesEl.innerHTML = rules.map(function (r) {
            var val = Array.isArray(r.value) ? r.value.join('、') :
              (typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value));
            return '<li class="flex items-start gap-3 p-4 rounded-xl hover:bg-surface-container-low">' +
              '<span class="material-symbols-outlined text-primary mt-0.5" style="font-variation-settings:\'FILL\' 1">check_circle</span>' +
              '<div><p class="font-bold">' + esc(ruleLabel(r.rule_field)) + (r.is_required ? '' : '<span class="text-on-surface-variant font-normal">（可选）</span>') + '</p>' +
              '<p class="text-on-surface-variant text-sm mt-1">' + esc(val) + '</p></div></li>';
          }).join('');
        } else {
          rulesEl.innerHTML = '<li class="flex items-start gap-3 p-4 rounded-xl">' +
            '<span class="material-symbols-outlined text-primary mt-0.5">info</span>' +
            '<div><p class="font-bold">申请条件</p>' +
            '<p class="text-on-surface-variant text-sm mt-1">' + esc(p.eligibility_summary || '请查看官方页面了解详细条件。') + '</p></div></li>';
        }
      }

      // 申报路径
      var appEl = $('#policy-application');
      if (appEl) {
        var method = p.application_method;
        if (method) {
          var steps = method.split(/[.;\n。]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 5);
          appEl.innerHTML = steps.map(function (s, i) {
            return '<div class="flex gap-4">' +
              '<div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">' + (i + 1) + '</div>' +
              '<div class="flex-grow pb-6 ' + (i < steps.length - 1 ? 'border-l-2 border-primary-fixed ml-[-20px] pl-[28px]' : '') + '">' +
              '<p class="text-sm text-on-surface-variant">' + esc(s) + '</p></div></div>';
          }).join('');
        } else {
          appEl.innerHTML = '<p class="text-on-surface-variant text-sm">请查看官方页面了解申报流程。</p>';
        }
      }

      // 摘要
      var summaryEl = $('#policy-summary');
      if (summaryEl) summaryEl.textContent = p.summary || p.eligibility_summary || '请参考官方页面了解完整信息。';

      // 详细内容
      var contentEl = $('#policy-content');
      var contentSection = $('#policy-content-section');
      if (contentEl && contentSection && p.content) {
        contentSection.style.display = '';
        contentEl.textContent = p.content;
      }

      // 标签
      var tagsEl = $('#policy-tags');
      var tagsSection = $('#policy-tags-section');
      if (tagsEl && tagsSection && tags.length) {
        tagsSection.style.display = '';
        tagsEl.innerHTML = tags.map(function (t) {
          return '<span class="bg-secondary-container text-on-surface-variant text-xs font-semibold px-3 py-1 rounded-full">' + esc(t) + '</span>';
        }).join(' ');
      }

      // Meta
      var metaEl = $('#policy-meta');
      if (metaEl) {
        var rows = [
          ['地区', region.name || '未知'],
          ['类型', typeLabel(p.type)],
          ['状态', p.status === 'active' ? '有效' : '待核实']
        ];
        if (p.time_limit_desc) rows.push(['时限', p.time_limit_desc]);
        if (p.confidence_score) rows.push(['置信度', Math.round(p.confidence_score * 100) + '%']);
        metaEl.innerHTML = rows.map(function (r) {
          return '<div class="flex justify-between py-2 border-b border-outline-variant/10 last:border-0"><span class="text-on-surface-variant">' + esc(r[0]) + '</span><span class="font-semibold">' + esc(r[1]) + '</span></div>';
        }).join('');
      }
    }).catch(function (err) {
      console.error('Policy load error:', err);
      titleEl.textContent = '加载失败';
      var summary = $('#policy-summary');
      if (summary) summary.textContent = '错误：' + err.message + '。请返回政策列表重试。';
    });
  }

  // ============================================
  // 简历上传
  // ============================================
  function setupResume() {
    var input = $('#resume-upload');
    if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var c = input.closest('label') || input.parentElement;
      var t = c && c.querySelector('h3');
      var d = c && c.querySelector('p');
      if (t) t.textContent = '已选择简历';
      if (d) d.textContent = file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB';
    });
  }

  // ============================================
  // 启动
  // ============================================
  document.addEventListener('DOMContentLoaded', function () {
    setupHome();
    setupMatch();
    setupPolicy();
    setupResume();
  });
})();
