(() => {
  'use strict';

  const ucl = 'https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/statistics-bsc';
  const uclInference = 'https://www.ucl.ac.uk/mathematical-physical-sciences/stat0005-probability-and-inference';
  const uclRegression = 'https://www.ucl.ac.uk/mathematical-physical-sciences/stat0006-regression-modelling';
  const uclProcesses = 'https://www.ucl.ac.uk/mathematical-physical-sciences/stat0007-introduction-stochastic-processes';
  const warwick = 'https://courses.warwick.ac.uk/modules/2023/ST221-12';
  const mitProbability = 'https://ocw.mit.edu/courses/18-05-introduction-to-probability-and-statistics-spring-2022/';
  const mitAlgebra = 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/';
  const openIntro = 'https://www.openintro.org/book/ims/';
  const studyDesign = 'https://openintro-ims.netlify.app/data-design';
  const appliedRegression = 'https://openintro-ims.netlify.app/model-mlr';
  const bike = 'https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset';
  const analyst = 'https://understand-digital-data-roles-skills.service.gov.uk/role/data-analyst/#1-associate-data-analyst';
  const rap = 'https://analysisfunction.civilservice.gov.uk/support/reproducible-analytical-pipelines/';
  const dataWorkflow = 'https://r4ds.hadley.nz/';

  window.STATS_MAP = {
    scope: '这张能力地图覆盖统计与因果推断的主要环节。先定义要量什么，再判断数据如何产生，最后用估计、模型与验证支持决定。三个快速体验可以随时开始。每张卡片列出深入学习的先修能力。点开卡片可看前后关系。',
    academic: '学科对标选取 UCL 统计本科大二的概率与推断、回归建模、随机过程、统计计算、统计设计与数据伦理，以及支撑它们的线性代数。华威本科二年级线性建模提供模型诊断和作业形式的交叉参考。通过综合作业时，记录自己实际展示了哪些能力。各校授课范围和正式考试另有要求。',
    industry: '行业对标采用英国政府初级数据分析师的典型工作。要求是在指导下澄清问题、清理数据、做基础分析和可视化、说明限制，并留下可复跑的结果。网站案例用于练习和自评。工作中的判断、沟通和交付需要在获准的真实任务中由同事或主管核对。',
    sources: [
      { label: 'UCL 统计本科课程结构 · 大二核心课', url: ucl },
      { label: 'UCL 概率与推断 · STAT0005', url: uclInference },
      { label: 'UCL 回归建模 · STAT0006', url: uclRegression },
      { label: 'UCL 随机过程 · STAT0007', url: uclProcesses },
      { label: '华威本科二年级线性建模 · ST221', url: warwick },
      { label: 'MIT 概率与统计 · 习题和试卷', url: mitProbability },
      { label: 'OpenIntro 现代统计 · 开放教学与练习', url: openIntro },
      { label: '英国政府 · 初级数据分析师能力框架', url: analyst },
      { label: '英国政府分析职能 · 可复现分析流程', url: rap },
      { label: 'UCI 共享单车 · 学科验收数据', url: bike },
    ],
    modules: [
      {
        id: 'measurement', title: '先问分母是谁', question: '相同的百分比，到底在比较哪些人、哪些事件和哪段时间？',
        prerequisites: [], methods: '确定分析单位、目标人群、资格条件、观察窗、分母和计数规则。区分比例、百分点和相对变化。',
        evidence: '两组各有分子、分母和时间窗，能追溯数据口径并处理零分母。',
        limits: '漏记、重复事件、条件不同或观察窗不齐都会改变比较。',
        task: '把两家外卖店写着「准时率 95%」的宣传改写成可以核对的一句话。',
        assessment: '在陌生案例中写出两组的可比口径，正确计算绝对差和相对差，并指出目前缺的记录。',
        availability: 'learn', experience: 'denominator', resource: {label: 'OpenIntro · 读懂数据结构', url: openIntro},
      },
      {
        id: 'maths', title: '看懂变量之间的结构', question: '模型用哪些信息解释变化，哪些信息其实重复了？',
        prerequisites: [], methods: '复习微积分、条件分布所需代数、向量、矩阵、秩、正交投影和最小二乘。',
        evidence: '写出带量纲的计算式或设计矩阵，用手算或可复算程序核对一个简单例子。',
        limits: '尺度差异、重复编码和近共线性会使数值或解释不稳定。',
        task: '用身高和体重等输入构造一个设计矩阵，在两个完全重复的变量中识别不可区分的系数。',
        assessment: '用小数据从矩阵形式重算拟合值与残差，解释完全共线时为什么没有唯一的系数。',
        availability: 'external', resource: {label: 'MIT OCW · 线性代数习题与考试', url: mitAlgebra},
      },
      {
        id: 'quality', title: '先检查数字怎么来的', question: '缺失、重复和异常记录会让结论朝哪个方向改变？',
        prerequisites: ['measurement'], methods: '检查主键、连接关系、重复、缺失和覆盖率。用分层图、摘要和敏感性对照检查异常。',
        evidence: '提供数据字典、检查表和被保留或排除的理由，报告清理前后的变化。',
        limits: '缺失可能集中于关键人群。删去异常值可能同时删去真实体验。',
        task: '用企鹅数据比较不同物种的鳍长和体重，记录缺失、异常点与分层后的差异。',
        assessment: '交付可复算的清理结果与图，说明缺失处理如何改变结论。',
        availability: 'external', resource: {label: 'R for Data Science · 变换与探索', url: dataWorkflow},
      },
      {
        id: 'sampling', title: '判断谁没有被看见', question: '手上的样本可以代表哪一群人？',
        prerequisites: ['measurement'], methods: '区分目标总体、抽样框和分析样本，比较随机抽样、分层抽样、自愿回应和不回应偏差。',
        evidence: '明确招募方式、覆盖范围、层内样本量与潜在偏差方向。',
        limits: '扩大同一自愿样本只能减少部分随机误差，难以补足遗漏的人群。',
        task: '为楼栋噪音调查设计分别覆盖临街和背街住户的抽样。',
        assessment: '针对一个现成调查说明可推广人群，并提出能改善覆盖的抽样方案。',
        availability: 'external', resource: {label: 'OpenIntro · 研究设计与抽样', url: studyDesign},
      },
      {
        id: 'probability', title: '用基率校准直觉', question: '知道一个线索之后，判断应改变多少？',
        prerequisites: ['maths'], methods: '用条件概率、独立性、贝叶斯公式、随机变量、常见分布和期望方差表达不确定性。',
        evidence: '在同一总体中列出基率与条件概率，给出解析计算或模拟结果。',
        limits: '独立假设须有依据。输入基率换了，后验结果也可能大幅变化。',
        task: '用一张 1000 封邮件的频数表，解释垃圾邮件很少时为什么被拦下的正常邮件也可能很多。',
        assessment: '独立算对一个陌生的基率问题，并复算两种相关性假设下的预期结果。',
        availability: 'external', resource: {label: 'MIT OCW · 概率、随机变量与习题', url: mitProbability},
      },
      {
        id: 'design', title: '设计一场公平比较', question: '改动发生前，怎样让结果更能回答原来的问题？',
        prerequisites: ['sampling'], methods: '定义处理、对照、分配单位和预先约定的结局。用随机分派、分层或区组控制已知差异，计划样本量与伦理检查。',
        evidence: '交付研究方案，记录分配方法、主要结局、分析规则、所需样本与退出或隐私处理。',
        limits: '中途换指标、组间串扰、漏记和退出会削弱证据。随机分派和随机抽样解决的问题不同。',
        task: '为两种手机提醒方式设计对照实验，选一个主要指标和一个打扰程度指标。',
        assessment: '独立写出可执行的分配与分析方案，说明最小有意义差异和两项需要监测的偏差。',
        availability: 'external', resource: {label: 'OpenIntro · 随机分派与实验', url: studyDesign},
      },
      {
        id: 'inference', title: '用区间判断是否值得行动', question: '样本里的差异有多稳，仍有多大可能落在行动门槛以下？',
        prerequisites: ['sampling', 'probability'], methods: '理解抽样分布、标准误、似然与估计量，用区间、检验、重抽样和功效衡量不确定性。',
        evidence: '同时报告点估计、区间、样本量、关键假设和预先设定的行动门槛。',
        limits: '区间依赖模型与抽样假设。多次查看结果、依赖样本和偏差需要专门处理。',
        task: '比较两份增益一样、区间宽窄不同的活动报告，决定扩大、维持小范围还是继续收数。',
        assessment: '独立为陌生样本构造或复算区间，解释方法适用条件，并说明它如何影响行动。',
        availability: 'learn', experience: 'uncertainty', resource: {label: 'UCL · 概率与推断', url: uclInference},
      },
      {
        id: 'causal', title: '分清相关与因果', question: '是这项改动让结果变了，还是本来就不同的人做了不同选择？',
        prerequisites: ['design', 'inference'], methods: '明确定义因果效应、反事实和目标人群。检查混杂、条件化和选择机制，比较随机实验与有明确假设的观察分析。',
        evidence: '交代分组机制、基线、随访和可能的混杂，给出识别假设及敏感性检查。',
        limits: '调整可测混杂仍依赖未测混杂等假设。组间干扰、处理不依从和失访会改变可支持的结论。',
        task: '比较「自愿使用专注 App」与「随机分派 App」的阅读时长结果。',
        assessment: '对陌生案例画出主要因果路径，区分数据支持的结论和超出证据的说法，并设计一项下一步验证。',
        availability: 'learn', experience: 'confounding', resource: {label: 'OpenIntro · 观察研究与实验', url: studyDesign},
      },
      {
        id: 'regression', title: '建模并解释模型失灵的地方', question: '加了变量之后，系数或预测到底能解释什么？',
        prerequisites: ['maths', 'quality', 'inference'],
        methods: '拟合线性与多元回归，使用分类变量和交互项，并按结局考虑广义线性模型。检查残差、影响点和样本外表现。',
        evidence: '提交模型对照、参数解释、诊断图和验证误差，说明为何选这个方法。',
        limits: '共线性、外推、模型假设不满足和目标泄漏会让估计或预测不可靠。模型调整本身无法确认因果。',
        task: '比较只用鳍长与再加物种的企鹅体重模型，解释结果差异和异常点。',
        assessment: '对新数据选取基线和候选模型，解释一个系数和一次诊断，并用未参与拟合的数据验证。',
        availability: 'external', resource: {label: 'OpenIntro · 多元回归与练习', url: appliedRegression},
      },
      {
        id: 'processes', title: '考虑前后相依的事件', question: '今天的状态会怎样影响明天，以及接下来一段时间？',
        prerequisites: ['probability'], methods: '用转移概率、马尔可夫模型、随机过程模拟和时间顺序描述状态变化。',
        evidence: '展示状态定义、转移计数或事件率，复算短期预测并对照真实历史。',
        limits: '状态或转移规则会随季节、场景改变，独立或稳定性假设需要检验。',
        task: '把共享单车站的空、可借、满三个状态做成简化转移表，估计下一时段缺车概率。',
        assessment: '给定转移矩阵计算两步概率，模拟复核，并说明观察到什么时需要换模型。',
        availability: 'external', resource: {label: 'UCL · 随机过程入门', url: uclProcesses},
      },
      {
        id: 'reproduce', title: '让别人能复跑和复核', question: '同事能从同一批原始数据重算出你的表和图吗？',
        prerequisites: ['quality'], methods: '保留数据版本、脚本、运行环境、随机种子、检查及修改记录，分开原始数据与衍生产物。',
        evidence: '给出一条运行入口、数据来源和预期输出，请同事或用干净环境复跑。',
        limits: '可复现性保障过程可检查，结论仍须满足数据范围、正确性、伦理与权限要求。',
        task: '把一张手工周报改造成可重跑脚本，加上主键、空值与指标对账检查。',
        assessment: '由第二人或独立环境从数据到图表复跑一次，记录差异、解决方案与安全处理。',
        availability: 'external', resource: {label: '英国政府分析职能 · 可复现工作流', url: rap},
      },
      {
        id: 'decision', title: '把分析变成可复核的决定', question: '当前证据够做什么？什么新结果会让我改变主意？',
        prerequisites: ['causal', 'regression', 'reproduce'], methods: '把问题、证据、不确定性、成本与风险连起来，比较行动方案并设置复查条件。',
        evidence: '提交一页决策说明和透明的分析过程，附上反对证据、复查条件与反馈修订记录。',
        limits: '同样的证据可对应不同的损失或收益。敏感结果只在获授权的范围内分享。',
        task: '针对一次低风险变更写出「现在怎么做、再收什么数据、何时复查」的短报告。',
        assessment: '在专业验收中用新任务写出可执行建议，约定停止或扩大条件，再根据复核反馈改一版。',
        availability: 'planned', resource: {label: '英国政府 · 数据分析岗位典型要求', url: analyst},
      },
    ],
    benchmark: {
      academic: {
        title: '大二专业课对标 · 共享单车需求',
        task: '用公开的 UCI Bike Sharing 小时数据，解释工作日和非工作日的使用差异，并检验方法在较晚时段的预测表现。',
        artifacts: '一份可复跑的脚本或笔记本、一页方法与结论、一项预测对照、两张诊断图及按天模拟或重抽样的说明。',
        prompt: '领取参考资料中的 UCI Bike Sharing 小时数据。回答工作日与非工作日的日内需求差异，以及这套模型能否预测较晚时段。先定义观测单位、比较人群和时段，检查缺失时点，用高峰与非高峰的分层图描述。按时间预留测试区间，比较一个季节或小时基线与一个加入天气、工作日和交互项的模型。选一个效应给出区间，说明如何处理同一天内观测相关；写两项模型诊断、一个样本外误差和一个可能改变结论的证据。补一道短题：给定两状态转移矩阵 [[0.8, 0.2], [0.4, 0.6]]，从状态 A 出发，两步后处于 B 的概率是多少？写出两条路径，解释实际记录怎样支持或挑战稳定转移假设。先提交自己的说明，再看评分依据。',
        criteria: [
          { id: 'scope', label: '报告记录单位、比较范围、缺失检查与图表口径。', repair: '在分析前先画出应有的日期和小时索引，对照实际出现的行，并记录如何处理缺口。' },
          { id: 'models', label: '比较基线与候选模型，解释交互与结果单位，避免目标泄漏。', repair: '写出模型公式，标明哪些量在预测时已知，并对照没有交互的模型。' },
          { id: 'evidence', label: '报告效应区间、相关性处理、模型诊断和按时间检验的误差。', repair: '按天分块做一个敏感性对照，画残差与预测值图，用较晚段复算同一误差指标。' },
          { id: 'probability', label: '写出两步概率的路径计算并指出稳定假设的检查方法。', repair: '列 A→A→B 和 A→B→B。分别在两个时段估计转移矩阵，对照其是否发生系统变化。' },
          { id: 'interpretation', label: '交付可复跑成果，明确关联、预测和因果主张的证据边界。', repair: '把结论重写成限定人群与时段的一句话，另列一条获得因果证据所需的设计。' },
        ],
        hint: '先保留较晚的一段时间再拟合。注意同一天的记录可能相似。预测总租用量时检查是否把总量的组成项当成了输入。',
        solution: '一种合格路线是按小时写清目标与缺口，先画分组日内曲线；用训练期的小时均值当基线，再拟合含工作日×时段交互和天气的模型。用按天分块的重抽样反映日内依赖，在时间留出集报告误差，查看残差和计数分散程度。总量的组成列不进入特征。A→A→B 与 A→B→B 的权重相加，0.8×0.2＋0.2×0.6＝0.28。可检验早晚时段转移表是否不同。报告模型结果的适用时段，工作日差异按关联来讲。实际系数与区间由自己的脚本和方法产生。',
        misstep: '随机打乱记录可能泄漏时间规律。把同一天的小时当作彼此独立可能使区间过窄。把天气调整后的工作日系数直接称作因果效应会超出设计可支持的结论。',
        retry: {
          prompt: '换一个陌生的计数场景。某社区按小时记录柜台访客，想比较周末与平日并预测下月客流。设计数据口径、基线和候选模型、时间留出、区间与诊断。两状态转移矩阵为 [[0.7, 0.3], [0.2, 0.8]]。从空闲出发，两步后繁忙的概率是多少？说明模型适用边界。',
          hint: '回想同一天里相邻小时的依赖，以及下月测试段的选择。两步概率要把不同的中间状态都算进去。',
          solution: '按营业小时对齐人流与缺失、节假日等口径。先用时段历史均值，再比较含周末×时段和天气等事前可用变量的模型，用按天分块的误差或区间，在后段检验并画残差图。两步后繁忙概率为 0.7×0.3＋0.3×0.8＝0.45。新活动或营业时间变更会改变规律，需要重新检查模型。',
        },
      },
      industry: {
        title: '初级岗位对标 · 复核一份周报',
        task: '接下主管交来的周报口径问题，在指导下核查数据，给团队一项能复核的行动建议，并记录复核后的修改。',
        artifacts: '指标口径与数据质量清单、可复跑的表格或脚本、一张图、一页决策说明、同事或主管反馈与修订。',
        prompt: '场景为教学模拟。团队问「新版是否让更多合格用户完成任务」。周报每行依次是周次、地区、合格用户、完成人数、日志覆盖率、完成窗口。第 40 周 A 为 1000／240／99%／24 小时，B 为 500／150／99%／24 小时；第 41 周 A 为 900／270／97%／24 小时，B 为 400／152／72%／7 天，且该行重复出现一次。先写两项你要向负责人确认的问题。清理重复，做可比范围的估计和一张能解释风险的图，并给出是否扩大上线的建议。留下来源、核查脚本或公式、未解决事项和复跑说明。请复核者核对你用的人群、指标或结论，再写一条基于反馈的修订。有获准的真实任务时，可以以脱敏的同类交付替换模拟案例，单独保留反馈证据。',
        criteria: [
          { id: 'requirements', label: '澄清目标、负责的人、口径和行动门槛。', repair: '先问新版生效日期和合格人群是否改变，再请负责人确认可接受的效果和风险。' },
          { id: 'quality', label: '发现重复、日志覆盖和时间窗变化，写出处理和追问。', repair: '按周与地区核对唯一性，把覆盖率和观察窗放在可比性检查的同一张表里。' },
          { id: 'analysis', label: '重算可比范围，图与文字体现数据局限。', repair: '只对齐能比较的 24 小时窗口并展示样本量。把目前不能做的跨地区比较标出来。' },
          { id: 'delivery', label: '交付可复跑过程和清楚的决策建议，保护敏感资料。', repair: '写出从输入到结论的复核步骤，限定共享范围，并指定何时补数与重新评估。' },
          { id: 'review', label: '保留一次复核反馈和有依据的修订，注明模拟或真实交付。', repair: '请复核者提出一个会影响判断的问题，把原结论、证据和修订版并排记录。' },
        ],
        hint: '先按周、地区检查唯一性，再看每组分母、覆盖率和完成窗口。周报里的数字可以更准确地回答部分问题。',
        solution: '第 41 周 B 行重复，先依据数据来源确认去重。B 的日志覆盖和窗口发生变化，原表不能支持它与此前的直接比较。A 在现有同口径记录中从 24% 升至 30%，增加 6 个百分点，同时保留 99% 到 97% 的覆盖变化。图中标出可比范围和样本量。建议先复核日志和同期分组，再考虑扩大上线。可复跑资料应保留输入版本、去重规则和计算过程。请复核者检查剩余缺失和外推范围，按反馈修订报告。',
        misstep: '把重复行加总或直接把不同观察窗混在一起，会让地区占比和趋势失真。从前后变化给新版下因果结论，会忽略同期变化与样本构成。',
        retry: {
          prompt: '换成门店排队周报。两周均上报「五分钟内服务率」，一条门店记录重复，另一店第 2 周改成只统计线上预约且日志覆盖下降。设计两项核查、一个可比较的指标和一条发给主管的行动建议。留出复核与改稿记录。',
          hint: '写清目标是全部到店顾客还是预约者，再决定分母与可比较范围。',
          solution: '核对周与门店唯一键和原始日志，向门店确认抽样对象与完整性。优先比较仍是全部到店且口径稳定的门店，标明样本量和缺口。门店模式变化的结果单列，先恢复一致口径再做推广判断。与主管确认盲点，记录改稿。',
        },
      },
    },
  };
})();
