/**
 * BayPier Supabase Client
 * 共享的数据层，所有页面引用
 */

const SUPABASE_URL = 'https://xcvbeyntfgjfyifyicha.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_DZIaADi3MLC5yPKv8bLKag_CFUGSSyw'

// 轻量 Supabase REST 客户端（不引入完整 SDK，减少依赖）
const BayPier = {
  // ============================================
  // REST 请求
  // ============================================
  async query(table, params = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    if (!res.ok) throw new Error(`Query failed: ${res.status}`)
    return res.json()
  },

  // ============================================
  // 政策相关
  // ============================================

  // 获取所有活跃政策（带地区信息）
  async getPolicies(filters = {}) {
    let params = '?select=*,regions(name,full_path)&order=subsidy_amount_max.desc'

    if (filters.regionId) {
      params += `&region_id=eq.${filters.regionId}`
    }
    if (filters.type) {
      params += `&type=eq.${filters.type}`
    }
    if (filters.status) {
      params += `&status=eq.${filters.status}`
    }

    return this.query('policies', params)
  },

  // 获取单条政策详情（含准入规则和标签）
  async getPolicy(id) {
    const params = `?id=eq.${id}&select=*,regions(name,full_path),policy_eligibility_rules(rule_field,operator,value,is_required),policy_tags(tag)`
    const results = await this.query('policies', params)
    return results[0] || null
  },

  // 获取所有地区
  async getRegions(level = 2) {
    return this.query('regions', `?level=eq.${level}&order=name`)
  },

  // ============================================
  // 用户画像（本地存储，未登录状态）
  // ============================================

  saveProfile(profile) {
    localStorage.setItem('baypier_profile', JSON.stringify(profile))
  },

  getProfile() {
    const data = localStorage.getItem('baypier_profile')
    return data ? JSON.parse(data) : null
  },

  // ============================================
  // 匹配逻辑（前端简易版）
  // ============================================

  async matchPolicies(profile) {
    const allPolicies = await this.getPolicies()

    return allPolicies.map(policy => {
      let score = 0
      let matchReasons = []
      let missingReasons = []

      // 地区匹配
      if (profile.targetCity && policy.regions) {
        const cityName = policy.regions.name
        if (cityName && profile.targetCity.includes(cityName.replace('市', ''))) {
          score += 40
          matchReasons.push(`目标城市匹配：${cityName}`)
        }
      }

      // 学历匹配
      const degreeRank = { '专科': 1, '本科': 2, '硕士': 3, '博士': 4 }
      if (profile.degree && policy.eligibility_summary) {
        const userRank = degreeRank[profile.degree] || 0
        const summary = policy.eligibility_summary

        // 检查政策是否要求特定学历
        if (summary.includes('博士') && userRank >= 4) {
          score += 20
          matchReasons.push('学历满足：博士')
        } else if (summary.includes('硕士') && userRank >= 3) {
          score += 20
          matchReasons.push('学历满足：硕士及以上')
        } else if (summary.includes('本科') && userRank >= 2) {
          score += 20
          matchReasons.push('学历满足：本科及以上')
        } else if (summary.includes('专科') || summary.includes('大专')) {
          score += 15
          matchReasons.push('学历满足：专科及以上')
        } else if (!summary.includes('博士') && !summary.includes('硕士') && !summary.includes('本科')) {
          score += 10 // 政策未明确学历要求
        } else {
          missingReasons.push('学历可能不满足要求')
        }
      }

      // 金额加分
      if (policy.subsidy_amount_max >= 100000) score += 15
      else if (policy.subsidy_amount_max >= 30000) score += 10
      else if (policy.subsidy_amount_max >= 10000) score += 5

      // 已验证加分
      if (policy.verified) score += 10

      // 匹配等级
      let matchLevel
      if (score >= 50) matchLevel = 'full'      // 完全满足
      else if (score >= 30) matchLevel = 'high'  // 大概率满足
      else matchLevel = 'possible'               // 可能满足

      return {
        ...policy,
        matchScore: score,
        matchLevel,
        matchReasons,
        missingReasons
      }
    })
      .sort((a, b) => b.matchScore - a.matchScore)
  },

  // ============================================
  // 工具函数
  // ============================================

  // policy_type 中文映射
  typeLabels: {
    'living_subsidy': '生活补贴',
    'rental_subsidy': '租房补贴',
    'housing_subsidy': '购房补贴',
    'settling_allowance': '落户安家费',
    'talent_introduction': '人才引进',
    'employment_subsidy': '就业补贴',
    'entrepreneurship': '创业扶持',
    'social_insurance': '社保补贴',
    'skill_training': '技能培训',
    'public_rental': '公租房',
    'other': '其他'
  },

  // 格式化金额
  formatAmount(amount) {
    if (!amount || amount <= 0) return '详见政策'
    if (amount >= 10000) return `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}万`
    return `${amount.toLocaleString()}`
  },

  // 匹配等级样式
  matchStyles: {
    full: { bg: 'bg-green-100', text: 'text-green-700', label: '完全满足' },
    high: { bg: 'bg-blue-100', text: 'text-blue-700', label: '大概率满足' },
    possible: { bg: 'bg-amber-100', text: 'text-amber-700', label: '可能满足' }
  }
}
