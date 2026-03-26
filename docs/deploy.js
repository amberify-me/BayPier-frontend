(function () {
  'use strict';

  // ============================================
  // 配置
  // ============================================
  var SUPABASE_URL = 'https://xcvbeyntfgjfyifyicha.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_DZIaADi3MLC5yPKv8bLKag_CFUGSSyw';
  var DEFAULT_CITY = { name: '厦门市', regionId: 'b0000000-0000-0000-0000-000000000011', province: '福建省' };
  var PROFILE_KEY = 'baypier-profile';

  var CITY_TREE = {
    '浙江省': [
      { name: '杭州市', regionId: 'b0000000-0000-0000-0000-000000000001' },
      { name: '宁波市', regionId: 'b0000000-0000-0000-0000-000000000002' }
    ],
    '广东省': [
      { name: '深圳市', regionId: 'b0000000-0000-0000-0000-000000000003' },
      { name: '广州市', regionId: 'b0000000-0000-0000-0000-000000000004' }
    ],
    '四川省': [
      { name: '成都市', regionId: 'b0000000-0000-0000-0000-000000000005' }
    ],
    '江苏省': [
      { name: '南京市', regionId: 'b0000000-0000-0000-0000-000000000006' },
      { name: '苏州市', regionId: 'b0000000-0000-0000-0000-000000000007' }
    ],
    '湖北省': [
      { name: '武汉市', regionId: 'b0000000-0000-0000-0000-000000000008' }
    ],
    '湖南省': [
      { name: '长沙市', regionId: 'b0000000-0000-0000-0000-000000000009' }
    ],
    '上海市': [
      { name: '上海市', regionId: 'a0000000-0000-0000-0000-000000000006' }
    ],
    '北京市': [
      { name: '北京市', regionId: 'a0000000-0000-0000-0000-000000000007' }
    ],
    '重庆市': [
      { name: '重庆市', regionId: 'b0000000-0000-0000-0000-000000000010' }
    ],
    '福建省': [
      { name: '厦门市', regionId: 'b0000000-0000-0000-0000-000000000011' }
    ]
  };

  // ============================================
  // 工具函数
  // ============================================
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function params() { return new URLSearchParams(window.location.search); }
  function go(url) { window.location.href = url; }
  function setText(s, v) { var el = qs(s); if (el) el.textContent = v; }
  function setHtml(s, v) { var el = qs(s); if (el) el.innerHTML = v; }
  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function saveProfile(p) {
    try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(p || {})); } catch (e) {}
  }
  function loadProfile() {
    try { return JSON.parse(sessionStorage.getItem(PROFILE_KEY) || '{}'); } catch (e) { return {}; }
  }

  // ============================================
  // Supabase REST
  // ============================================
  function api(path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY }
    }).then(function (r) {
      if (!r.ok) throw new Error('API ' + r.status);
      return r.json();
    });
  }

  function fetchPolicies(regionId) {
    return api('policies?select=*,regions(name,full_path),policy_tags(tag)&region_id=eq.' +
      encodeURIComponent(regionId) + '&status=eq.active&order=subsidy_amount_max.desc');
  }

  function fetchAllPolicies() {
    return api('policies?select=*,regions(name,full_path),policy_tags(tag)&status=eq.active&order=subsidy_amount_max.desc&limit=50');
  }

  function fetchPolicyDetail(id) {
    return api('policies?select=*,regions(name,full_path),policy_eligibility_rules(rule_field,operator,value,is_required),policy_tags(tag)&id=eq.' +
      encodeURIComponent(id)).then(function (rows) { return rows[0] || null; });
  }

  // ============================================
  // 标签映射
  // ============================================
  var TYPE_LABELS = {
    living_subsidy: '生活补贴', rental_subsidy: '租房补贴', housing_subsidy: '购房补贴',
    settling_allowance: '安家补贴', talent_introduction: '人才引进', employment_subsidy: '就业补贴',
    entrepreneurship: '创业扶持', social_insurance: '社保补贴', skill_training: '技能培训',
    public_rental: '公租房', other: '其他'
  };
  var RULE_LABELS = {
    degree: '学历要求', graduation_year: '毕业年份', school_tier: '院校层次',
    employment_status: '就业状态', has_social_insurance: '社保要求', hukou_type: '户口类型'
  };

  function typeLabel(t) { return TYPE_LABELS[t] || '政策'; }
  function ruleLabel(f) { return RULE_LABELS[f] || f || '申请条件'; }
  function moneyText(p) {
    if (p.subsidy_amount_desc) return p.subsidy_amount_desc;
    if (p.subsidy_amount_max > 0) return '最高 ' + p.subsidy_amount_max.toLocaleString('zh-CN') + ' 元';
    return '详见官方说明';
  }

  // ============================================
  // 首页
  // ============================================
  function setupHome() {
    var form = qs('#search-form');
    if (!form) return;

    // 省市联动选择器
    var sel = qs('#location-select');
    if (sel) {
      sel.dataset.stage = 'province';
      renderProvinces(sel);
      sel.addEventListener('change', function () {
        if (sel.dataset.stage === 'province') {
          if (sel.value) renderCities(sel, sel.value);
        } else if (sel.value === '__back__') {
          renderProvinces(sel);
        } else if (sel.value) {
          var opt = sel.options[sel.selectedIndex];
          sel.dataset.regionId = sel.value;
          sel.dataset.cityName = opt ? opt.textContent : '';
        }
      });

      // 恢复上次选择
      var saved = loadProfile();
      if (saved.province && saved.regionId) {
        renderCities(sel, saved.province, saved.regionId);
      }
    }

    // 表单提交
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var profile = {
        province: sel ? (sel.dataset.province || '') : '',
        city: sel ? (sel.dataset.cityName || '') : '',
        regionId: sel ? (sel.dataset.regionId || '') : '',
        degree: (qs('#degree-input') || {}).value || '',
        school: (qs('#school-input') || {}).value || '',
        major: (qs('#major-input') || {}).value || ''
      };

      // 没选城市就用默认
      if (!profile.regionId) {
        profile.province = DEFAULT_CITY.province;
        profile.city = DEFAULT_CITY.name;
        profile.regionId = DEFAULT_CITY.regionId;
      }

      saveProfile(profile);
      var url = 'match.html?city=' + encodeURIComponent(profile.city) +
        '&regionId=' + encodeURIComponent(profile.regionId);
      if (profile.degree && profile.degree !== '请选择') url += '&degree=' + encodeURIComponent(profile.degree);
      if (profile.school) url += '&school=' + encodeURIComponent(profile.school);
      go(url);
    });
  }

  function renderProvinces(sel) {
    sel.dataset.stage = 'province';
    sel.dataset.province = '';
    sel.dataset.cityName = '';
    sel.dataset.regionId = '';
    sel.innerHTML = '<option value="">请选择省份</option>' +
      Object.keys(CITY_TREE).map(function (p) {
        return '<option value="' + escHtml(p) + '">' + escHtml(p) + '</option>';
      }).join('');
  }

  function renderCities(sel, province, preselect) {
    var cities = CITY_TREE[province] || [];
    sel.dataset.stage = 'city';
    sel.dataset.province = province;
    sel.innerHTML = '<option value="">请选择城市</option>' +
      '<option value="__back__">\u2190 返回重选省份</option>' +
      cities.map(function (c) {
        return '<option value="' + escHtml(c.regionId) + '"' +
          (preselect === c.regionId ? ' selected' : '') + '>' + escHtml(c.name) + '</option>';
      }).join('');
    if (preselect) {
      sel.dataset.regionId = preselect;
      var opt = sel.querySelector('option[value="' + preselect + '"]');
      if (opt) sel.dataset.cityName = opt.textContent;
    }
  }

  // ============================================
  // 政策列表页
  // ============================================
  function setupMatch() {
    var list = qs('#results-list');
    if (!list) return;

    var p = params();
    var profile = loadProfile();
    var regionId = p.get('regionId') || profile.regionId || DEFAULT_CITY.regionId;
    var cityName = p.get('city') || profile.city || DEFAULT_CITY.name;

    setText('#results-title', '正在加载...');
    setText('#results-subtitle', '查询「' + cityName + '」的政策数据');
    list.innerHTML = '<div class="text-center py-16 text-on-surface-variant"><p>加载中...</p></div>';

    // 更新画像侧边栏
    var summary = qs('#profile-summary');
    if (summary) {
      var degree = p.get('degree') || profile.degree || '未填写';
      var school = p.get('school') || profile.school || '';
      summary.innerHTML =
        '<div class="flex items-center gap-2 text-sm font-semibold"><span class="material-symbols-outlined text-primary text-lg">location_on</span>' + escHtml(cityName) + '</div>' +
        '<div class="flex items-center gap-2 text-sm font-semibold"><span class="material-symbols-outlined text-primary text-lg">school</span>' + escHtml(degree + (school ? ' · ' + school : '')) + '</div>';
    }

    fetchPolicies(regionId).then(function (policies) {
      setText('#results-title', '为您找到 ' + policies.length + ' 项政策');
      setText('#results-subtitle', '当前展示「' + cityName + '」的有效政策。');

      if (!policies.length) {
        list.innerHTML = '<div class="bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(0,95,156,0.06)]">' +
          '<h2 class="font-headline text-2xl font-bold mb-3">暂无政策</h2>' +
          '<p class="text-on-surface-variant">当前未找到「' + escHtml(cityName) + '」的有效政策数据。</p></div>';
        return;
      }

      list.innerHTML = policies.map(function (item, i) { return buildCard(item, i); }).join('');
    }).catch(function (err) {
      console.error(err);
      setText('#results-title', '加载失败');
      list.innerHTML = '<div class="bg-surface-container-lowest p-8 rounded-xl"><p class="text-on-surface-variant">请返回首页重试。错误：' + escHtml(err.message) + '</p></div>';
    });
  }

  function buildCard(item, index) {
    var tagClass = item.verified ? 'bg-green-100 text-green-700' :
      ((item.confidence_score || 0) >= 0.7 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700');
    var tagText = item.verified ? '已核验' :
      ((item.confidence_score || 0) >= 0.7 ? '高匹配' : '待核验');
    var cityName = (item.regions && item.regions.name) || '';

    return '<article class="relative overflow-hidden bg-surface-container-lowest p-8 rounded-xl shadow-[0_20px_40px_rgba(0,95,156,0.06)] flex flex-col md:flex-row gap-6 items-start">' +
      '<div class="match-tag ' + tagClass + '">' + escHtml(tagText) + '</div>' +
      '<div class="flex-1">' +
        '<div class="flex items-center gap-3 mb-4 flex-wrap">' +
          '<span class="bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">' + escHtml(typeLabel(item.type)) + '</span>' +
          (cityName ? '<span class="text-on-surface-variant text-sm">' + escHtml(cityName) + '</span>' : '') +
        '</div>' +
        '<h2 class="font-headline text-2xl font-bold text-on-surface mb-2">' + escHtml(item.title) + '</h2>' +
        '<p class="text-on-surface-variant mb-6 line-clamp-2">' + escHtml(item.eligibility_summary || item.summary || '点击查看详情。') + '</p>' +
        '<div class="flex items-center gap-8 flex-wrap">' +
          '<div><p class="font-label text-[10px] uppercase tracking-widest text-outline mb-1">补贴金额</p>' +
          '<p class="text-2xl font-black text-primary tracking-tight font-headline">' + escHtml(moneyText(item)) + '</p></div>' +
          (item.time_limit_desc ? '<div class="h-10 w-px bg-outline-variant/20"></div><div><p class="font-label text-[10px] uppercase tracking-widest text-outline mb-1">时限</p><p class="text-lg font-bold">' + escHtml(item.time_limit_desc) + '</p></div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="w-full md:w-auto self-end">' +
        '<a class="w-full md:w-auto bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-xl font-bold shadow-[0_10px_20px_rgba(0,95,156,0.15)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 no-underline" href="policy.html?id=' + encodeURIComponent(item.id) + '">查看详情<span class="material-symbols-outlined text-lg">arrow_forward</span></a>' +
      '</div>' +
    '</article>';
  }

  // ============================================
  // 政策详情页
  // ============================================
  function setupPolicy() {
    if (!qs('#policy-title')) return;
    var id = params().get('id');
    if (!id) {
      setText('#policy-title', '未指定政策');
      return;
    }

    // 城市切换器
    var switcher = qs('#city-switcher');
    if (switcher) {
      Object.keys(CITY_TREE).forEach(function (prov) {
        CITY_TREE[prov].forEach(function (c) {
          var opt = document.createElement('option');
          opt.value = c.regionId;
          opt.textContent = c.name;
          switcher.appendChild(opt);
        });
      });
      switcher.addEventListener('change', function () {
        if (!switcher.value) return;
        var opt = switcher.options[switcher.selectedIndex];
        go('match.html?city=' + encodeURIComponent(opt.textContent) + '&regionId=' + encodeURIComponent(switcher.value));
      });
    }

    fetchPolicyDetail(id).then(function (p) {
      if (!p) throw new Error('政策不存在');
      var region = p.regions || {};
      var rules = p.policy_eligibility_rules || [];
      var tags = (p.policy_tags || []).map(function (t) { return t.tag; }).filter(Boolean);

      // Hero
      setText('#policy-title', p.title);
      setText('#policy-authority', (region.name || '未知') + (p.verified ? ' · 已核验' : ' · 待核验'));
      setText('#policy-expiry', p.time_limit_desc || '请以官方为准');
      setText('#policy-amount-tag', moneyText(p));
      setText('#policy-money', moneyText(p));
      document.title = p.title + ' - 白漂 BayPier';

      // 官方链接
      var link = qs('#policy-official-link');
      if (link && p.official_url) {
        link.href = p.official_url;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.style.display = '';
      }

      // 摘要
      setText('#policy-summary', p.summary || p.eligibility_summary || '请参考官方页面了解完整信息。');

      // Meta 信息
      var meta = qs('#policy-meta');
      if (meta) {
        meta.innerHTML =
          '<div class="flex justify-between"><span class="text-outline">地区</span><span class="font-semibold">' + escHtml(region.name || '未知') + '</span></div>' +
          '<div class="flex justify-between"><span class="text-outline">类型</span><span class="font-semibold">' + escHtml(typeLabel(p.type)) + '</span></div>' +
          '<div class="flex justify-between"><span class="text-outline">状态</span><span class="font-semibold">' + (p.status === 'active' ? '有效' : '待核实') + '</span></div>' +
          (p.time_limit_desc ? '<div class="flex justify-between"><span class="text-outline">时限</span><span class="font-semibold">' + escHtml(p.time_limit_desc) + '</span></div>' : '') +
          (p.confidence_score ? '<div class="flex justify-between"><span class="text-outline">置信度</span><span class="font-semibold">' + Math.round(p.confidence_score * 100) + '%</span></div>' : '');
      }

      // 申报条件
      if (qs('#policy-rules')) {
        if (rules.length) {
          qs('#policy-rules').innerHTML = rules.map(function (r) {
            var val = Array.isArray(r.value) ? r.value.join('、') :
              (typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value));
            return '<li class="flex items-start gap-4 p-4 rounded-xl hover:bg-surface-container-low transition-colors">' +
              '<span class="material-symbols-outlined text-primary mt-1" style="font-variation-settings:\'FILL\' 1">check_circle</span>' +
              '<div><p class="font-bold text-on-surface">' + escHtml(ruleLabel(r.rule_field)) + (r.is_required ? '' : '（可选）') + '</p>' +
              '<p class="text-on-surface-variant text-sm mt-1">' + escHtml(val) + '</p></div></li>';
          }).join('');
        } else {
          qs('#policy-rules').innerHTML = '<li class="flex items-start gap-4 p-4 rounded-xl">' +
            '<span class="material-symbols-outlined text-primary mt-1">info</span>' +
            '<div><p class="font-bold text-on-surface">申请条件</p>' +
            '<p class="text-on-surface-variant text-sm mt-1">' + escHtml(p.eligibility_summary || '请以官方页面的完整说明为准。') + '</p></div></li>';
        }
      }

      // 申报路径
      if (qs('#policy-application')) {
        if (p.application_method) {
          var steps = p.application_method.split(/[.;\n。]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
          if (steps.length) {
            qs('#policy-application').innerHTML = steps.map(function (s, i) {
              return '<div class="relative flex items-center gap-6">' +
                (i < steps.length - 1 ? '<div class="absolute left-5 top-10 w-0.5 h-16 bg-outline-variant/30"></div>' : '') +
                '<div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center font-bold z-10">' + (i + 1) + '</div>' +
                '<div class="flex-grow bg-surface-container-low p-6 rounded-2xl border border-sky-50">' +
                '<p class="text-sm text-on-surface-variant">' + escHtml(s) + '</p></div></div>';
            }).join('');
          }
        } else {
          qs('#policy-application').innerHTML = '<p class="text-on-surface-variant p-4">请查看官方页面了解申报流程。</p>';
        }
      }

      // 详细说明
      if (p.content && qs('#policy-content-section')) {
        qs('#policy-content-section').style.display = '';
        qs('#policy-content').textContent = p.content;
      }

      // 标签
      if (tags.length && qs('#policy-tags-section')) {
        qs('#policy-tags-section').style.display = '';
        qs('#policy-tags').innerHTML = tags.map(function (t) {
          return '<span class="bg-secondary-container text-on-surface-variant text-xs font-semibold px-3 py-1 rounded-full">' + escHtml(t) + '</span>';
        }).join('');
      }
    }).catch(function (err) {
      console.error(err);
      setText('#policy-title', '加载失败');
      setText('#policy-summary', '请返回重试：' + err.message);
    });
  }

  // ============================================
  // 简历上传
  // ============================================
  function setupResume() {
    var input = qs('#resume-upload');
    if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var container = input.closest('label') || input.parentElement;
      var title = container && container.querySelector('h3');
      var desc = container && container.querySelector('p');
      if (title) title.textContent = '已选择简历';
      if (desc) desc.textContent = file.name + ' · ' + Math.max(1, Math.round(file.size / 1024)) + ' KB';
    });
  }

  // ============================================
  // 初始化
  // ============================================
  document.addEventListener('DOMContentLoaded', function () {
    setupHome();
    setupMatch();
    setupPolicy();
    setupResume();
  });
})();
