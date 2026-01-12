# 初始

AI赋能也可以作为辅助裁判，帮助仲裁员获得仲裁信息，辅助仲裁流程。

现在，我想请你以一个高级架构师开发者的角度，去设计一段完整的，描述需求、功能、模块、UI/UX界面、技术栈的中文system prompt，以指导大模型进行开发平台的工作。

再次重申几个注意事项：
1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
5. 开发时遵循最小开发原则
6. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
7. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
12. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
13. 指定大模型使用context7和mcp-feedback-enhanced这个mcp

现在，你需要做的是根据我提出的需求、程序、以及注意事项，要求大模型生成相关文档，以确定产品的整体开发方向；要求大模型牢记我提出的注意事项，并应用到后续的开发过程当中；要求大模型学习仲裁的规则，以及你总结的在线视频仲裁阶段的各个环节等内容——旨在让大模型通过这个prompt了解整个项目的全部信息

---

# system prompt

AI赋能也可以作为辅助裁判，帮助仲裁员获得仲裁信息，辅助仲裁流程。

现在，我想请你以一个高级架构师开发者的角度，去设计一段完整的，描述需求、功能、模块、UI/UX界面、技术栈的中文system prompt，以指导大模型进行开发平台的工作。

再次重申几个注意事项：
1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
5. 开发时遵循最小开发原则
6. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
7. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
12. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
13. 指定大模型使用context7和mcp-feedback-enhanced这个mcp

现在，你需要做的是根据我提出的需求、程序、以及注意事项，要求大模型生成相关文档，以确定产品的整体开发方向；要求大模型牢记我提出的注意事项，并应用到后续的开发过程当中；要求大模型学习仲裁的规则，以及你总结的在线视频仲裁阶段的各个环节等内容——旨在让大模型通过这个prompt了解整个项目的全部信息

---

# 开发前端原型图

**[ROLE & PERSONA]**
You are **'LegalMind Architect & Product Innovator'**. You are not just a developer; you are a visionary architect building the future of LegalTech. Your mandate is to construct the frontend prototype for 'LegalMind Arbitrate'. You must embody the following principles:
*   **Architectural Rigor:** Your code is clean, scalable, and meticulously structured.
*   **Product Ownership:** You think critically about the user's needs and proactively suggest improvements.
*   **Design Excellence:** You have an impeccable taste for modern, minimalist, and user-centric design, transforming functional requirements into emotionally resonant experiences.
*   **Unwavering Discipline:** You follow all project rules and documentation protocols without exception.

**[PROJECT GOAL & PHILOSOPHY]**
Your mission is to build a functional and visually stunning frontend prototype for **'LegalMind Arbitrate'**. This platform must be a flagship product within the 'LegalMind' ecosystem. Your work will be guided by four core philosophies:
1.  **Trust through Clarity:** The UI must be transparent and intuitive, making the complex arbitration process feel manageable and trustworthy.
2.  **Efficiency through Intelligence:** Every feature, especially AI integrations, must demonstrably save users time and reduce cognitive load.
3.  **Authority through Design:** The visual language must be premium and professional, conveying the solemnity and authority of arbitration while remaining approachable.
4.  **Innovation within Bounds:** While adhering to legal and project constraints, you are encouraged to innovate on user interactions and AI applications to create a truly groundbreaking product.

**[THE GOLDEN RULES OF DEVELOPMENT (MANDATORY)]**
This is your non-negotiable operational framework:
1.  **Documentation is Law:** All project documents in the `/docs` directory are your single source of truth. You MUST read the relevant documents before starting any task and update them upon completion of any significant work.
2.  **Rule Adherence is Absolute:** You MUST follow all rules in the `/rules` directory, with `FIRST-RULE` being your highest priority command.
3.  **Structure is Sacred:** The root folder structure (`/docs`, `/Prototype`, `/rules`, `/prompt`, `/dev`) is immutable. All code must reside within `/dev`.
4.  **MVP is the Path:** Development must be incremental and modular. Build one small, complete, bug-free feature at a time. A feature is "complete" only when it is coded, tested, and documented.
5.  **Constant Debugging:** Maintain a state of zero bugs and console errors at the end of each work session.
6.  **Memory & Conflict Resolution:** Keep your internal memory updated. If your memory conflicts with the `/docs`, the documentation ALWAYS wins. You must pause, state the conflict, re-read the documents, confirm your new understanding, and then proceed.
7.  **MCP & Context:** Utilize the `mcp-feedback-enhanced` MCP and `context7` for all operations.

**[INNOVATION MANDATE (YOUR CREATIVE LICENSE)]**
You are empowered to enhance this platform. When you identify an opportunity for improvement that aligns with our philosophy but is not explicitly detailed in the requirements, you are encouraged to propose it.
*   **Format:** Prefix your suggestions with `[INNOVATION PROPOSAL]`.
*   **Content:** Your proposal should briefly describe the feature/improvement, its benefit to the user, and its potential impact on the development timeline.
*   **Examples of welcome innovations:**
    *   Suggesting a more intuitive data visualization for case timelines.
    *   Proposing a gamification element for the user onboarding process.
    *   Identifying a novel AI application to further assist arbitrators.
    *   Improving accessibility features beyond the basic requirements.

**[DETAILED PROTOTYPE SPECIFICATION]**
You will now build the frontend prototype based on the "Prototype Structure Blueprint" and the following detailed page descriptions. All pages must be populated with realistic (but mock) data.

**1. Public Pages (`/app/(public)`)**
*   **Homepage (`/page.tsx`):** A visually stunning landing page. Use strong hero imagery, the orange/white color scheme, and clear calls-to-action ("申请仲裁", "登录").
*   **Login/Register (`/login`, `/register`):** Clean, single-purpose forms. For registration, implement a multi-step process: 1. Account Info -> 2. Identity Type (Individual/Enterprise) -> 3. Real-Name Verification (with placeholders for OCR and face scan).

**2. Private Workspace (`/app/(private)`)**
*   **Layout (`/layout.tsx`):** A persistent layout featuring the main Sidebar (collapsible) and Header.
*   **Dashboard (`/dashboard/page.tsx`):** The user's command center.
    *   **User Story:** "As a user, I want to see my most urgent tasks and case updates at a glance, so I can immediately know what to work on."
    *   **Architect's Note:** This is the most critical page for user engagement. The layout should be a clean grid of cards.
        *   **`WelcomeCard`:** A personalized greeting.
        *   **`ActionCenterCard (AI To-Do)`:** A prioritized list of tasks with countdowns (e.g., "答辩状剩余提交时间: 2天 16小时"). This should be the focal point.
        *   **`MyCasesCard`:** A summary list of ongoing cases with a visual progress bar for each, indicating the current stage (e.g., 立案 -> 庭前准备 -> **开庭** -> 裁决).
*   **New Case Application (`/cases/new/page.tsx`):**
    *   **User Story:** "As an applicant, I want a guided process to submit my arbitration case without feeling overwhelmed by legal forms."
    *   **Architect's Note:** Design this as a multi-step wizard, not a single long form.
        1.  `Dispute Info`: Basic case information.
        2.  `Parties`: Add applicant/respondent details.
        3.  `Evidence Upload`: A modern drag-and-drop file uploader with progress bars and the ability to add descriptions to each piece of evidence.
        4.  `Review & Submit`: An AI-generated summary of the application for final review.
*   **Case Details (`/cases/[caseId]/page.tsx`):** A tabbed interface.
    *   **`Overview Tab`:** Implement a beautiful, vertical timeline component visualizing the case's entire lifecycle.
    *   **`Evidence Tab`:** The most interactive section. Display evidence in a table. Each row should have actions for `Preview`, `Download`, and importantly, `质证` (Cross-examination). Clicking `质证` should open a modal where the other party can submit their opinion.
    *   **`Tribunal Tab`:** A visually appealing display of the arbitrator profiles. During the selection phase, this tab transforms into an interactive selection interface where users can click on arbitrator cards to view details and make their choice.

**3. The Digital Courtroom (`/hearing/[sessionId]/page.tsx`)**
*   **User Story:** "As a participant in an online hearing, I need an environment that feels official, is easy to navigate, and allows for clear, structured communication and evidence presentation."
*   **Architect's Note:** This is the "Aha!" moment.
    *   **Layout:** A full-screen, low-distraction UI. Use a dark/dimmed mode option to enhance focus on the video feeds.
    *   **Onboarding:** Before entering, create a "Virtual Lobby" modal for camera/mic checks and identity re-verification.
    *   **Core UI:** Implement the static layout with placeholders for `MainSpeakerView`, `ParticipantGrid`, `TranscriptPanel`, and `EvidenceViewer`.
    *   **Interactive Mockups:** The buttons (`Raise Hand`, `Present Evidence`, `Mute`) should be functional at the UI level (e.g., clicking `Raise Hand` shows a raised hand icon on the user's video feed).

**[INITIAL TASK: Project Scaffolding & Dashboard UI Implementation]**

Your first mission is to lay the foundation and build the most important user-facing page.

1.  **Acknowledge and Synthesize:** Begin by stating in your own words: "I am LegalMind Architect & Product Innovator. My task is to build a high-fidelity frontend prototype for LegalMind Arbitrate, following all documentation and rules, while proactively seeking opportunities for innovation. My first goal is to scaffold the project and build the static Dashboard page."

2.  **Initialize Project Structure:** Execute the necessary commands to create the complete file and folder structure as outlined in the "Prototype File Structure" blueprint within the `/dev` directory.

3.  **Implement Layouts:** Code the static `(public)/layout.tsx`, `(private)/layout.tsx`, and the root `layout.tsx`. The private layout must contain the Sidebar and Header components with placeholder links.

4.  **Develop Dashboard Components:**
    *   Create a new directory `/dev/src/components/dashboard/`.
    *   Inside, create and export the following static components using `shadcn/ui` and placeholder data: `WelcomeCard.tsx`, `ActionCenterCard.tsx`, and `MyCasesCard.tsx`.
    *   The `ActionCenterCard` should visually distinguish between different task types (e.g., a red icon for urgent deadlines, a blue icon for informational tasks).
    *   The `MyCasesCard` must include a multi-stage progress bar component.

5.  **Assemble Dashboard Page:** Import the components you created into `/dev/src/app/(private)/dashboard/page.tsx` and arrange them in a responsive grid layout.

6.  **Propose an Innovation:** As the final step for this task, present one `[INNOVATION PROPOSAL]` related to the Dashboard page. This could be about data visualization, user interaction, or an AI feature.

Now, proceed with Step 1.

---

# 改善1

目前的功能实现上还有一些问题：

1. 工作台现在有两个新建申请按钮，取消小的那一个

2. 点击个人头像页面的动画仍然显示错误

3. 左侧功能栏的各项功能页应当做的大一些，美观一些，布局好一些

4. 仲裁案件的详情页进度显示错误

5. 仲裁案件的详情页内容太少，应当要体现仲裁案件可执行的一些操作，如：

   1. 操作目录：
      1. 当事人信息
      2. 仲裁费
      3. 仲裁员
      4. 举证质证
      5. 问题单
      6. 答辩书
      7. 调解
      8. 撤案
      9. 财产保全
      10. 管辖异议
      11. 变更仲裁请求
      12. 变更代理人
   2. 文书目录：
      1. 交费电子回单
      2. 仲裁庭组成人员通知
      3. 应裁举证通知书
      4. 仲裁申请书
      5. 身份证明材料
      6. 证据

   这些操作和文书都应当和「文书生成」功能紧密联系在一起进行工作。并且，这些内容应当以一个二级侧边栏的形式呈现，使UX更加便于操作

6. 我们这个系统是一个复杂的、互相联通协作的系统，因此在设计时一定要注意一致性和各个功能之间的连通性

另外，应当注意：

应当进行仲裁员和当事人的身份切分，仲裁员需要注意的事项和当事人不一样。

---

# 改善2

如图：
目前的功能实现上还有一些问题：

1. 工作台现在有两个新建申请按钮，取消小的那一个。同时在仪表盘上现在居然同时有两个详情界面，产生了冲突，请你自己查看相关界面文件，去除重复并将整个页面设置美观一些 



2. 点击个人头像页面的动画仍然显示错误



3. 左侧功能栏的各项功能页应当做的大一些，美观一些，布局好一些



4. 仲裁案件的详情页进度显示更加美观一些  



5. 仲裁案件的详情页内容太少，应当要体现仲裁案件可执行的一些操作，如：



1. 操作目录：

​      1. 当事人信息

​      2. 仲裁费

​      3. 仲裁员

​      4. 举证质证

​      5. 问题单

​      6. 答辩书

​      7. 调解

​      8. 撤案

​      9. 财产保全

​      10. 管辖异议

​      11. 变更仲裁请求

​      12. 变更代理人

2. 文书目录：

​      1. 交费电子回单

​      2. 仲裁庭组成人员通知

​      3. 应裁举证通知书

​      4. 仲裁申请书

​      5. 身份证明材料

​      6. 证据


   这些操作和文书都应当和「文书生成」功能紧密联系在一起进行工作。并且，这些内容应当以一个二级侧边栏的形式呈现，使UX更加便于操作作



![image.png](bed7c674e7da7edf001f211c0e1c6083c6ff89a34cd08949f9569d9ac69426ad.png)


   如图，目前的UI设计和UX设计较小，按钮“案件操作”太小了，应该放大一些
   这些文书生成和操作界面应当有一个窗口来进行相关的操作，例如计算仲裁费时应当有计算窗口；请求财产保全时，也应当生成相关财产保全申请格式文书，并且发起相关要求——这些发起的动作都应当在案件详情页中体现，以符合仲裁流程的需要

6. 在点击小铃铛显示“消息”时，我希望此时显示消息并非转到某个页面，而是在页面中显示一个具有遮盖和浮动的窗口



7. 我们这个系统是一个复杂的、互相联通协作的系统，因此在设计时一定要注意一致性和各个功能之间的连通性



另外，应当注意：

在进行仲裁员和当事人的身份切分时，应该在登录界面前就作出切分，而不是在登录之后作出切分。
**特别注意***：仲裁员、当事人这两个身份看到的东西是有很大差别的。例如当事人可以申请仲裁，而仲裁员就只能进行仲裁；当事人可以针对仲裁案件进行财产保全、管辖异议申请等行为，但是仲裁员不行。

应当站在仲裁员的身份去思考一个这样的流程：

---

# 切换为GPT-5

注意本轮对话的任务是制作一个高保真的前端原型图，虽然这个原型图大概率会直接应用成为前端。

我在看你更改这几轮对话的时候，感觉你对于整个项目都不是很熟悉。
请你将所有文档和所有文件浏览学习一遍之后，获得对这个项目充分的认识。

我能够向你指出，目前这个项目最需要解决的问题是在线庭审环节的页面设计，这个环节的最基础最质朴流程应当是这样的：
“
程序与界面设计：
阶段一：庭前准备（开庭前15分钟）
界面：一个虚拟等候室。
功能：
设备检测：自动检测摄像头、麦克风、网络状况，并提供指引。
身份核验：再次通过人脸识别与实名认证信息比对，确认参与人身份。
庭审须知：弹出窗口展示庭审纪律，要求用户勾选确认。
材料预람：当事人可以最后一次查看自己的证据材料列表。
互动：此时可以与本方的代理人进行文字私聊，或与仲裁庭秘书沟通程序性问题。
阶段二：开庭与身份核对（庭审开始）
界面布局：
主画面：当前发言人（系统通过语音激励自动切换）。
参与人列表：显示所有人的视频小窗，并标注身份（首席仲裁员、仲裁员、申请人、被申请人、代理人、证人等）。
庭审笔录区：由AI实时生成庭审笔录，滚动显示。
证据展示区：默认收起，点击证据列表中的文件后在此区域展示。
流程：
首席仲裁员点击“宣布开庭”，系统自动记录时间，并播放一段简短、庄重的开庭动画。
书记员（或AI助手）依次核对各方当事人及代理人身份，被核对人的视频窗口会高亮显示。
阶段三：庭审调查与辩论
互动与功能：
发言管理：仲裁员拥有“全体静音”和“指定发言”的权限。当事人需要发言时，点击“举手”按钮，仲裁员授权后方可发言。
证据质证：
任何一方点击证据列表中的“出示证据”，该证据（PDF、图片、视频）会显示在“证据展示区”。
提供共享高亮和标注工具，发言人可以实时在证据上圈画，所有参与者同步可见。
对方可以针对该证据，点击“发表质证意见”，其发言会被系统自动标记为对某证据的质证。
证人出庭：仲裁员可将“等候室”的证人“邀请入庭”。证人仅在作证环节出现，作证完毕后由仲裁员“请出法庭”。
仲裁庭内部沟通：三位仲裁员之间有一个加密的文字/语音沟通频道，可以随时就程序性问题进行短暂合议，不影响庭审进程。
AI深度赋能：
实时智能笔录：语音转文字，实时生成庭审笔录，并能区分不同角色的发言。当事人可对笔录中的识别错误之处进行勘误申请。
争议焦点分析：AI在庭审过程中，根据双方发言实时分析和提炼争议焦点，并展示在仲裁员的专属面板上，辅助其归纳总结。
信息核查：AI可对庭审中出现的关键信息（如金额、日期）与已提交的证据进行比对，如有出入，会向仲裁员发出低风险提示。
阶段四：最后陈述与休庭
流程：首席仲裁员宣布进入最后陈述阶段，依次给予双方固定时间的最后陈述机会（界面上会有倒计时）。
休庭/闭庭：首席仲裁员点击“宣布休庭/闭庭”，系统记录时间，庭审结束。
庭后：庭审结束后，平台会立刻生成一份完整的、经初步整理的庭审笔录和视频回放，供各方在规定时间内确认。
”
你应当在上述流程的基础上作出符合开发需要的改善，并且作出功能上的完善，提倡互动性和一致性。

同时，开发时应当注意：

1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
5. 开发时遵循最小开发原则
6. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
7. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
12. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
13. 指定大模型使用context7和mcp-feedback-enhanced这个mcp

---

# 改善3

我们现在开始就整个平台的使用进行检测，单独就每个部分提出相关的问题，落实到你那里则应当成为后期改善的任务：

- 「介绍页」（路由localhost:3000）：
  1. 更改首页介绍语“让仲裁变得简单高校”，想一个范围更广的，更能体现法律效率因技术赋能变得更加强大的目的
  2. 「产品介绍」、「功能特色」「仲裁规则」、「费用标准」、「隐私政策」、「服务条款」、「免责声明」、「联系我们」、「技术支持」、「意见反馈」、「加入我们」、「关于我们」页面没有。这些页面必须要有。
  3. 首页不需要存在「设置与帮助」，「产品介绍」就已经涵盖了教程的功能
  4. 按钮“立即申请仲裁”和按钮“立即开始”应当跳转到仪表盘界面，但在跳转之前应当做一个鉴权，检测是否登录或注册，若未登录或注册则跳转到登录或注册界面
  5. 404页面出现的「搜索功能」取消掉
- 「注册界面」（路由 http://localhost:3000/register）：不存在，应当开发相关的界面引导注册。参照等保三级的需要

- 「忘记密码界面」（路由 http://localhost:3000/forgot-password）：不存在，同样应当开发相关界面引导找回

- 「仪表盘界面」（路由 http://localhost:3000/dashboard）：

  1. 按钮“新建申请”和该界面中已经有的按钮“新建仲裁申请”按钮冲突，如图所示![image-20250815020010329](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250815020010329.png)

  应当将元素：

  ```<button data-slot="button" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 shrink-0 [&amp;_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 focus-visible:ring-offset-2 cursor-pointer relative overflow-hidden border-2 shadow-sm hover:text-white hover:border-orange-500 hover:shadow-lg hover:scale-105 active:scale-95 h-8 rounded-md gap-1.5 px-3 has-[&gt;svg]:px-2.5 bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus w-4 h-4 mr-2" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>新建申请</button>```删除

  2. 各个卡片的排列顺序太诡异了。“我的案件”卡片应当靠前，并且较为主要地进行显示。就重要信息进行相应的加重
  3. 点击按钮“通知”后不应当有遮罩
  4. 点击右上角的区域“个人信息”后显示的动画依然很诡异，和通知的动画一致，但现在是从远处飞过来的。相关代码：

  ```
  <div data-side="bottom" data-align="end" role="menu" aria-orientation="vertical" data-state="open" data-radix-menu-content="" dir="ltr" id="radix-_R_2r9etbH1_" aria-labelledby="radix-_R_2r9etb_" data-slot="dropdown-menu-content" class="text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto p-1 shadow-md w-56 shadow-brand-lg border border-orange-100 bg-white rounded-lg" tabindex="-1" data-orientation="vertical" style="outline: none; --radix-dropdown-menu-content-transform-origin: var(--radix-popper-transform-origin); --radix-dropdown-menu-content-available-width: var(--radix-popper-available-width); --radix-dropdown-menu-content-available-height: var(--radix-popper-available-height); --radix-dropdown-menu-trigger-width: var(--radix-popper-anchor-width); --radix-dropdown-menu-trigger-height: var(--radix-popper-anchor-height); pointer-events: auto;"><div data-slot="dropdown-menu-label" class="px-2 py-1.5 text-sm font-medium data-[inset]:pl-8 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200"><div class="flex flex-col space-y-1"><span class="text-sm font-medium text-gray-900">张伟</span><span class="text-xs text-gray-600">zhang.wei@company.com</span></div></div><div role="separator" aria-orientation="horizontal" data-slot="dropdown-menu-separator" class="bg-border -mx-1 my-1 h-px"></div><a class="focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&amp;_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 hover:bg-orange-50 focus:bg-orange-50 flex items-center space-x-2 cursor-pointer" role="menuitem" data-slot="dropdown-menu-item" data-variant="default" tabindex="-1" data-orientation="vertical" data-radix-collection-item="" href="/settings"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings w-4 h-4 text-orange-500" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg><span>设置与帮助</span></a><div role="separator" aria-orientation="horizontal" data-slot="dropdown-menu-separator" class="bg-border -mx-1 my-1 h-px"></div><div role="menuitem" data-slot="dropdown-menu-item" data-variant="default" class="focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&amp;_svg:not([class*='text-'])]:text-muted-foreground relative gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 flex items-center space-x-2 cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50" tabindex="-1" data-orientation="vertical" data-radix-collection-item=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out w-4 h-4" aria-hidden="true"><path d="m16 17 5-5-5-5"></path><path d="M21 12H9"></path><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path></svg><span>退出登录</span></div></div>
  ```

  5. 点击右上角的区域“个人信息”后不用产生设置与帮助
  6. 仪表盘顶部的区域“搜索”功能应当实现

- 「案件管理页」（路由http://localhost:3000/cases）：

  1. 点击按钮“新建案件”无反应，应当跳转到「新建申请页」
  2. 在该页面点击选项“全部状态”和“全部类型”时产生的选项夹动画，和点击右上角区域“个人信息”后显示的动画一致，都是从远处飞来。并且整个页面会有一些跳动，这不太正常，修复它
  3. 点击按钮“更多筛选”无反应
  4. 如图，点击区域“案件列表”，案件卡片的修改按钮和三个点按钮无反应![image-20250815020914875](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250815020914875.png)

- 「新建仲裁申请页面」（路由http://localhost:3000/cases/new）：

  1. 新建一个案件统一叫“新建仲裁”，不要叫什么“新建申请”或者“新建案件”，这一点要在各个案件中统一
  2. 如图，该页面的返回案件列表按钮渲染有误，排版也有些问题![image-20250815021125668](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250815021125668.png)

- 「草稿箱页面」（路由http://localhost:3000/cases/drafts）

  1. 和「案件管理页」有同样的问题，依然是点击案件卡片的修改按钮和三个点按钮无反应。这个组件是不是没有做？要做
  2. 点击按钮“继续编辑”无反应

- 「在线庭审页面」（路由http://localhost:3000/hearing/online）：这个页面极其重要，也是几次开发的重点，但其现在显示404未找到，说明你没有开发。你应当开发。

- 「庭审记录页面」（路由http://localhost:3000/hearing/records）：同「在线庭审页面」

- 「仲裁员库页面」（路由http://localhost:3000/arbitrators）：

  1. 点击按钮“筛选条件”无反应
  2. 点击仲裁员的按钮“查看详情”和“选择仲裁员”无反应，应当制作仲裁员个人身份信息介绍的详情页

- 「文档管理页面」（路由http://localhost:3000/documents）：

  1. 点击按钮“上传文档”无反应
  2. 这一页的文档库们基本都没有反应，无法查看也无法修改，无法标星，说明还很简陋，这个页面应当继续开发，开发文档的详情展示页面

- 「调解管理页面」（路由http://localhost:3000/mediation）：

  1. 该页面在左侧功能栏区域“调解服务”下没有体现，进而没有设置进入的通道，应当设置
  2. 点击按钮“申请调解”无法跳转到「调解申请页面」
  3. 点击按钮“进入调解”没有跳转相应界面。这里应当跳转到「在线庭审界面」中，因为调解无非就是线上在线视频调解。
  4. 点击按钮“查看详情”没有跳转到相应界面
  5. 点击按钮“设置”无反应

- 「调解申请界面」（路由http://localhost:3000/mediation/apply）：

  1. 该页面非常古怪，其更像一个详情页，而非一个申请页面。功能上有误
  2. 同「调解管理页面」，点击按钮“进入调解”没有跳转相应界面。这里应当跳转到「在线庭审界面」中，因为调解无非就是线上在线视频调解。

- 「日程管理页面」（路由http://localhost:3000/schedule）：

  1. 点击按钮“新建日程”无反应。应当点击之后弹出一个窗口，以记录相关事项
  2. 该页面应当参考图片设计，做一个泳道图的直观设计，可以让用户一眼看出自己应当做哪些事情。
  3. 该页面的开发依然不够完全，点击相应事件应当可以跳转到相应事件详情页中，而点击非事件应当以弹窗形式展现非事件的所有内容

- 另外：
  1. 删除功能栏中的系统设置，以及相关的所有路由。在「系统设置页面」（路由http://localhost:3000/settings）已经具有了应当具有的所有内容
  2. **依然没有鉴权之后的身份跳转功能，即没有仲裁员的页面。这是非常重要的事情，在改善上述内容之后，仲裁员的界面应当作为重中之重进行重点开发。**
  3. **同时，在线视频庭审也属于重中之重，是功能模块的重大缺失，必须将其开发完全。**

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，进行专项的修复。

---

# 改善4

现在，请你学习@docs文件夹中的文档，rules的全部规则特别是名为FIRST-RULE的规则，以及memory中对于该项目情况的介绍，在使用mcp的情况下，全面且深刻地把握这个项目，理解目前项目处于开发前端原型图的阶段。

之后，我开始就整个平台的使用进行检测，单独就每个部分提出相关的问题，落实到你那里则应当成为后期改善的任务：

- 「介绍页」（路由localhost:3000）：
  1. 按钮“立刻申请仲裁”和按钮“立即开始”在功能上是一致的，因而保留前者，删除后者。后者不应该对接注册界面而前者对接登录界面，这不符合逻辑。应当是点击按钮“立刻申请仲裁”之后开始鉴权：如果已经登录，则跳转到仪表盘界面；如果没有登录，则跳转到登录界面——不需要跳转到注册界面。
  2. 按钮“申请仲裁”删除掉，有了按钮“登录”后就没有存在的必要。
  
- 「注册页」（路由http://localhost:3000/register)：
  1. 为什么会有“安全合规”的字样唐突出现？删除掉。
  
- 「找回密码页」（路由http://localhost:3000/forgot-password）：
  1. 既然都实现了发送重置链接的做法，那就实现的彻底一点，不要点击了发送重置链接之后直接跳转到登录页。
  
- 「仪表盘」（路由http://localhost:3000/dashboard）：

  1. 点击右上角的区域“个人用户”后，选项的弹出动画依然是从左上角飞入，这比较古怪。应该做成弹窗从上到下展开。

  2. 点击按钮“查看所有洞察”之后无反应。既然在这里设置了这么一个按钮，不如把它的详情页做出来。

- 「案件管理」（路由http://localhost:3000/cases）

  1. 点击按钮“全部状态”和“全部类型”后，同「仪表盘」页面中的区域“个人用户”一样，选项的弹出动画依然是从左上角飞入，这比较古怪。应该做成弹窗从上到下展开。
  2. 如图，按钮“重置筛选”在页面上的分布不够美观。
  3. 如图，案件详情卡片排布不够美观。
  4. 如图，按钮“创建时间”、“降序”、“上一页、”下一页“的分布都出现重大错误，挤占了原本案件详情卡片中的案件内容。

  ![image-20250816195850544](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250816195850544.png)

  5. 如图，点击按钮三个小点之后显示

  ![image-20250816200021722](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250816200021722.png)

  实现这个部分的功能

- 「草稿箱」（路由http://localhost:3000/cases/drafts）：

  1. 点击按钮“继续编辑”后，转到的填写申请界面则是一个空的空白界面，说明没有保存申请草稿的内容。这个部分还是要实现的

- 「案件详情」（路由http://localhost:3000/cases/case-002）：

  1. 按钮“进入等候室”、按钮“进入庭审”不美观，风格和主题应当和其他按钮一致
  2. 点击按钮“案件操作与文书”后，只有仲裁费可用。操作清单：仲裁员的选择、举证质证、问题单、答辩书、调解、撤案、财产保全、管辖异议、变更仲裁请求、变更代理人；文书目录交费电子回单、仲裁庭组成人员通知、应裁举证通知书、仲裁申请书、身份证明材料、证据——上述功能还没有完全开发完毕，应当完全开发完毕。

- 「在线庭审」（路由http://localhost:3001/hearing/online）：

  1. 按钮“身份校验”无效果
  2. 按钮“设备设置”无效果

- 「仲裁员库」（路由http://localhost:3001/arbitrators）：

  1. 目前基本上没有开发

- 「文档管理」（路由http://localhost:3001/documents）：

  1. 如图，点击按钮“上传文档”后的窗口不是很美观，主题和我们的不符合。

  ![image-20250816233306232](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250816233306232.png)

- 「文书生成」（路由http://localhost:3001/documents/generate）：

  1. 如图，按钮“返回文档管理”的分布不合理，应当在更左侧
  2. 如图，步骤“填写信息”、“AI生成”、“预览下载”与相应的1-2-3是脱节的；同时这里的步骤风格和之前「案件详情」（路由http://localhost:3001/cases/case-002）中的案件进度区域不一样，所用的组件也不同。这再次体现对于一致性和连通性的追求必须要得到贯彻

- 「调解申请」（路由http://localhost:3001/mediation/apply）：

  1. 区域“调解申请表”中的选项“关联案件（可选）”应当和「调解管理」（路由http://localhost:3001/mediation/management）中的调解案件保持连通
  2. 点击按钮“提交调解申请”之后正确显示了正确提交窗口，但应该就此做一个跳转，跳转到“调解管理”窗口中。以凸显连通性和一致性

- 「调解管理」（路由http://localhost:3001/mediation/management）：

  1. 点击该页中的调解事项，无法跳转到调解事项的详情页中。这再次凸显开发系统时要注重一致性和连通性
  2. 注意身份的切换。调解案件中分有调解员和当事人，在本系统中，调解员和仲裁员为统一身份，当事人则属于统一身份
  3. 不同身份对于调解的管理应当不同
  4. 调解详情页应当得到开发。这个部分应当连同「庭审管理」功能，旨在实现在线调解

- 「在线庭审」（路由http://localhost:3001/hearing/online）：

  1. “在线庭审”这个词不好。应当可以改变，如果是走仲裁程序，则叫在线仲裁如果是走调解程序，则叫在线调解
  2. 进入「在线庭审」的通道应当有三个：
     1. 启动仲裁程序，通过仲裁案件详情页的案件高亮，进入在线仲裁
     2. 启动调解程序，通过调解案件详情页的案件高亮，进入在线调解
     3. 输入房间唯一识别码，从而进入相关在线视频室
  3. 庭审的运行逻辑一定要够清晰，要有程序性：首先测试设备，其次核验身份（通过人脸识别和仲裁员/调解员询问确认），最后开始进行仲裁或调解。仲裁和调解过程中，要设置好三方位置：当事人双方和仲裁员（或调解员），并且要设计三方的互动，以符合仲裁或调解程序
  4. 前端原型应当可以调用摄像头，以安排三方进行对话
  5. 这个部分还是没有开发完全，一定要详尽开发，在充分理解需求的情况下作为一个重点项目进行。

- 「日程管理」（路由http://localhost:3001/schedule）

  1. 点击按钮“新建日程”后弹出一个窗口记录相关事项的功能不够完善。建立的事项还没有体现在前端原型中，做到实时响应。
  2. 该页面应当参考图片设计，做一个泳道图的直观设计，可以让用户一眼看出自己应当做哪些事情。

  ![image-20250817032653153](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250817032653153.png)

  3. 该页面的开发依然不够完全，点击相应事件应当可以跳转到相应事件详情页中，而点击非事件应当以弹窗形式展现非事件的所有内容

- 另外：

  1. 按钮“通知”之后呈现的按钮“查看所有通知”无反应。这里应该开发一个浮动窗口弹出，用于查看各类事项。
  2. **再次重申：本系统特别注意一致性和连通性，组件的复用性，以及UI/UX的精巧设计。这因此要求你应当在进行改动时全面地审视整个平台系统的功能、组件、设计语言。同时为了保持这种一致。因此要求你实时创建或更新文档，以及更新memory，以记录解决问题的方法以及程序语言设计、组件设计，保持开发上一致性和功能间的连通性。**
  
- 开发时的注意事项：

  1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
  2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
  3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
  4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
  5. 开发时遵循最小开发原则
  6. 约束开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
  7. 要求开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
  8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
  9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
  10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
  11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
  12. 指定开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
  13. 特别注意使用context7获得最佳实践，使用mcp-feedback-enhanced这个mcp

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，进行专项的修复。

---

# 改善5

现在，请你学习@docs文件夹中的文档，rules的全部规则特别是名为FIRST-RULE的规则，以及memory中对于该项目情况的介绍，在使用mcp的情况下，全面且深刻地把握这个项目，理解目前项目处于开发前端原型图的阶段。

之后，我开始就整个平台的使用进行检测，单独就每个页面或每个功能提出相关的问题，或是改善建议，落实到你那里则应当成为这轮对话改善的任务：

- 「登录页」（路由localhost:3000/login）：
  1. 点击按钮“手机号登录”后无反应。应当将页面切换为手机号、验证码样式
  2. 点击右上角区域“用户”，点击按钮“退出登录”后无反应。应当显示安全退出，并提示用户删除缓存。
  3. 另外，登录时也要设计超时登录机制。一旦登录后停止时间过长，便提示后台鉴权过期，需要重新登录。
- 「仪表盘」（路由/dashboard）：
  1. 鉴权机制仍不完善。测试以arb开头的邮箱登录后显示可以查看仲裁员身份，但进入仪表盘后切换身份，又不可以选择仲裁员了。说明这个前端鉴权机制似乎没有完善。你应当回复这个鉴权机制是否必须要等待后台开发之后才能正常使用。
  2. 仪表盘中的“已实名认证”部分和“今日重点”一定要和设置以及任务打通，不能成为一个空的数值。
- 「案件管理」（路由http://localhost:3000/cases）：
  1. 点击按钮”...“之后显示的”复制案件“、“导出案件”、“归档案件”功能都在开发中。把这些开发实现。**同时把这个平台系统中所有“待开发”的功能全部实现**

- 「案件详情」（路由http://localhost:3000/cases/case-002）：

  1. 区域“仲裁庭”的按钮“添加仲裁员”功能未能很好实现。应当开发一个弹窗，数据连通仲裁员库，显示目前已有的仲裁员，在选择之后组庭。以将相应的仲裁员信息显示到案件详情页面。这个功能其实你在点击按钮“案件操作与文书”在“仲裁员”这个部分就已经实现了，特别好。**在区域“仲裁庭”的按钮“添加仲裁员”功能同步一下就可以了。**
  2. 之后点击按钮“进入在线庭审”这个逻辑不对，而是发给仲裁员和当事人开庭通知，**要将主持仲裁程序和调解程序的主导权归给仲裁员/调解员**
  3. 区域“文档”中的案件卡片，点击右侧的“下载”按钮和“...”按钮无效果，点击按钮“加入展示队列”同样无效果
  4. 点击按钮“编辑案件”无法做到真正编辑案件
  5. 点击按钮“案件操作与文书”后显示的“操作目录”中的“当事人信息parties功能”“答辩书denfense功能”、“调解mediation功能”、“撤案withdrawal功能”、“管辖异议jurisdiction功能”、“变更仲裁请求change-request功能”、“变更代理人change-agent功能”还在开发。**同样的，把这个平台系统中所有“待开发”的功能全部实现。**
  6. 我希望目前案件的进展是可以根据我完成相应的任务变动的。

- 「在线庭审」（路由/hearing/online）

  1. 在线庭审不能随便进入，要么通过：1. 仲裁案件详情权限开放可以进入；2. 调解案件详情权限开放可以进入；3. 输入相应庭审案码后进入
  2. 在线庭审要处理好仲裁员/调解员和当事人双方的地位和形象，因此应当要把这个页面做出来，去查看三人的形象、所占区域情况是否恰当
  3. 在线视频环节要随流程进行。但目前的开发似乎没有融入仲裁的流程和调解的流程。
  4. 仲裁流程和调解流程不一样，应当作出区分。
  5. 进入庭审视频会议室时应当将相应区域改变，例如自动收缩侧边栏，放大视频区域
  6. 这个部分还是很重要，好好开发。

- 「庭审记录」（路由/hearing/records/）：

  1. 庭审记录的详情页还要记录关键点，方便双方就该点进行协商，辅助仲裁员裁判。

- 「仲裁员详情页」（路由/arbitrators/arb-002）：

  1. 你既然做了按钮“发送消息”以及按钮“预约咨询”，就应当开发相应的界面。但这个界面不用太麻烦，预约咨询就相当于给该仲裁员发出一个申请，希望其能进入仲裁，否则则由院方自行安排。

- 「文档页」（路由documents/）：

  1. 每个文档的标签应当完整列出，可以供人在详情页添加之后在管理页面显示。
  2. 点击按钮“编辑”后显示“编辑页面开发中”，实现这个开发。

- 「文档详情页」（路由documents/1）：

  1. 你既然做了评论，就应该实现相关功能。但不应该叫评论，而应该叫备注
  2. 按钮“在线游览”应当改为“在线编辑”，如果可以的话，在前端页面中希望能实现在线编辑功能。
  3. 在区域“预览”显示的按钮“打开浏览”点击后无反应，如果可以的话，在前端页面中希望能实现在线浏览的功能。

- 「调解申请页」（路由/mediation/management）：

  1. 点击相关调解卡片之后无法进入到「调解详情页」，点击按钮“查看”、“评论”、“管理”后均无反应，说明在调解这套流程你没有开发好，**重点开发**，注意和庭审管理功能模块和案件管理模块的对接。

- 「日程安排页」（路由/schedule）：

  1. 点击按钮“新建日程”后弹出一个窗口记录相关事项的功能不够完善。建立的事项还没有体现在前端原型中，做到实时响应。
  2. 该页面应当参考图片设计，做一个泳道图的直观设计，可以让用户一眼看出自己应当做哪些事情。

  ![image-20250817032653153](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250817032653153.png)

  3. 该页面的开发依然不够完全，点击相应事件应当可以跳转到相应事件详情页中，而点击非事件应当以弹窗形式展现非事件的所有内容
  4. **该页面非常重要，把左侧功能页往上调整，屈于仲裁管理之下。你应当注意这个页面的连通性，例如向仲裁员提出预约申请同意后，都会在日程管理中体现相应时间和信息。**

- 「AI智能助手页」（路由/ai-assistant）：

  1. 现有的AI助手功能非常好。AI助手的目的便旨在：**帮助当事人快速理解目前情况，进入相关功能；帮助仲裁员/调解员理解案件详情，把握案件事实，梳理案件信息，注意重要文件并熟悉相关功能**。
  2. 基于上，你应当在整个平台中制作一个**悬浮的小按钮，类似小助手的形象，可以简要与其对话。**

- 「设置页」（路由/settings）：

  1. 从区域“个人资料”就可以看出：我即便是进入当事人身份，但还是属于仲裁员身份，如图。这说明平台目前对于身份切换还是有误。

  ![image-20250818005433121](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818005433121.png)

  2. 其中有些功能既然写出来了就该开发到位。

- 另外

  1. 点击“搜索框“之后没有方式退出，按钮ESC也不行。应当设计点击搜索框外的其他区域后便可关闭机制
  2. 在每一页的下方添加图中内容

  ![image-20250818004936057](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818004936057.png)

  3. 出现在每一个选项的动画问题仍然存在，例如这个元素：

  <button type="button" role="combobox" aria-controls="radix-_r_25_" aria-expanded="false" aria-autocomplete="none" dir="ltr" data-state="closed" data-slot="select-trigger" data-size="default" class="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 w-32"><span data-slot="select-value" style="pointer-events: none;">全部状态</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down size-4 opacity-50" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>

  aria-expanded和data-state两个元素变化之后，引起的选项框仍然是从左上角飞下来。没有实现我们想要达到的”渐变折叠“功能

  4. 整个组件的设计不好，当我把窗口缩小时，出现了明显的显示错误。如图

  ![image-20250818002838866](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818002838866.png)

  	5. **再次重申：本系统特别注意一致性和连通性，组件的复用性，以及UI/UX的精巧设计。这因此要求你应当在进行改动时全面地审视整个平台系统的功能、组件、设计语言。同时为了保持这种一致。因此要求你实时创建或更新文档，以及更新memory，以记录解决问题的方法以及程序语言设计、组件设计，保持开发上一致性和功能间的连通性。**

- 开发时的注意事项：

  1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
  2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
  3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
  4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
  5. 开发时遵循最小开发原则
  6. 约束开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
  7. 要求开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
  8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
  9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
  10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
  11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
  12. 指定开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
  13. 特别注意使用context7获得最佳实践，使用mcp-feedback-enhanced这个mcp

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，并开始进行专项的修复。

---

# 改善6

目前项目处于开发前端原型图的阶段。

经过一轮的改善，的确对于一些问题有了改善。经过我对整个平台的使用进行检测，仍然还是有一些问题没有改善。因而依旧的，单独就每个页面或每个功能提出相关的问题，或是改善建议，落实到你那里则应当成为这轮对话改善的任务：

- 「仪表盘」（路由/dashboard）：

  1. 鉴权机制仍不完善。测试以arb开头的邮箱登录后显示可以查看仲裁员身份，但进入仪表盘后切换身份，又不可以选择仲裁员了。说明这个前端鉴权机制似乎没有完善。你应当回复这个鉴权机制是否必须要等待后台开发之后才能正常使用。
  2. 点击按钮”...“之后显示的”复制案件“、“导出案件”、“归档案件”功能**仍然还在**开发中。把这些开发实现。**同时把这个平台系统中所有“待开发”的功能全部实现**

- 「案件详情」（路由http://localhost:3000/cases/case-002）：

  1. 区域“仲裁庭”的按钮“添加仲裁员”功能未能很好实现。应当开发一个弹窗，数据连通仲裁员库，显示目前已有的仲裁员，在选择之后组庭。以将相应的仲裁员信息显示到案件详情页面。这个功能其实你在点击按钮“案件操作与文书”在“仲裁员”这个部分就已经实现了，特别好。**在区域“仲裁庭”的按钮“添加仲裁员”功能同步一下就可以了。**
  2. 之后点击按钮“进入在线庭审”这个逻辑不对，而是发给仲裁员和当事人开庭通知，**要将主持仲裁程序和调解程序的主导权归给仲裁员/调解员**
  3. 区域“文档”中的案件卡片，点击右侧的“下载”按钮和“...”按钮无效果，点击按钮“加入展示队列”同样无效果
  4. 点击按钮“编辑案件”无法做到真正编辑案件
  5. 点击按钮“案件操作与文书”后显示的“操作目录”中的“管辖异议jurisdiction功能”、“变更仲裁请求change-request功能”、“变更代理人change-agent功能”还在开发。**同样的，把这个平台系统中所有“待开发”的功能全部实现。**
  6. 我希望目前案件的进展是可以根据我完成相应的任务变动的。

- 「在线庭审」（路由/hearing/online）

  1. 在线庭审不能随便进入，要么通过：1. 仲裁案件详情权限开放可以进入；2. 调解案件详情权限开放可以进入；3. 输入相应庭审案码后进入
  2. **在线庭审要处理好仲裁员/调解员和当事人双方的地位和形象，因此应当要把这个页面做出来，去查看三人的形象、所占区域情况是否恰当**
  3. 在线视频环节要随流程进行。但目前的开发似乎没有融入仲裁的流程和调解的流程。
  4. 仲裁流程和调解流程不一样，应当作出区分。
  5. 进入庭审视频会议室时应当将相应区域改变，例如自动收缩侧边栏，放大视频区域
  6. 这个部分还是很重要，好好开发。

- 「庭审记录」（路由/hearing/records/）：

  1. 庭审记录的详情页还要**记录关键点**，方便双方就该点进行协商，辅助仲裁员裁判。

- 「文档页」（路由documents/）：

  1. 点击按钮“编辑”后显示“编辑页面开发中”，实现这个开发。

- 「文档详情页」（路由documents/1）：

  1. 你既然做了评论，就应该实现相关功能。但不应该叫评论，而应该叫备注
  2. 按钮“在线预览”应当改为“在线编辑”，如果可以的话，在前端页面中希望能实现在线编辑功能。
  3. 在区域“预览”显示的按钮“打开浏览”点击后无反应，如果可以的话，在前端页面中希望能实现在线浏览的功能。

- 「调解管理页」（路由/mediation/management）：

  1. 点击相关调解卡片之后无法进入到「调解详情页」，点击按钮“查看”、“评论”、“管理”后均无反应，说明在调解这套流程你没有开发好，**重点开发**，注意和庭审管理功能模块和案件管理模块的对接。

- 「日程安排页」（路由/schedule）：

  1. 点击按钮“新建日程”后弹出一个窗口记录相关事项的功能不够完善。建立的事项还没有体现在前端原型中，做到实时响应。
  2. 该页面应当参考图片设计，做一个泳道图的直观设计，可以让用户一眼看出自己应当做哪些事情。

  ![image-20250817032653153](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250817032653153.png)

  3. 该页面的开发依然不够完全，点击相应事件应当可以跳转到相应事件详情页中，而点击非事件应当以弹窗形式展现非事件的所有内容
  4. **该页面非常重要，把左侧功能页往上调整，屈于仲裁管理之下。你应当注意这个页面的连通性，例如向仲裁员提出预约申请同意后，都会在日程管理中体现相应时间和信息。**

- 「AI智能助手页」（路由/ai-assistant）：

  1. 现有的AI助手功能非常好。AI助手的目的便旨在：**帮助当事人快速理解目前情况，进入相关功能；帮助仲裁员/调解员理解案件详情，把握案件事实，梳理案件信息，注意重要文件并熟悉相关功能**。
  2. 之前我要求制作一个悬浮的小按钮，类似小助手的形象，可以简要与其对话。目前这个小按钮的功能实现的挺好的，但是无法收放、显示逻辑有误、无法拖动，和AI智能助手页不够连通。

- 「设置页」（路由/settings）：

  1. 从区域“个人资料”就可以看出：我即便是进入当事人身份，但还是属于仲裁员身份，如图。这说明平台目前对于身份切换还是有误。

  ![image-20250818005433121](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818005433121.png)

  2. 其中有些功能既然写出来了就该开发到位。

- 另外

  1. 出现在每一个选项的动画问题仍然存在，例如这个元素：

  <button type="button" role="combobox" aria-controls="radix-_r_25_" aria-expanded="false" aria-autocomplete="none" dir="ltr" data-state="closed" data-slot="select-trigger" data-size="default" class="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 w-32"><span data-slot="select-value" style="pointer-events: none;">全部状态</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down size-4 opacity-50" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>

  aria-expanded和data-state两个元素变化之后，引起的选项框仍然是从左上角飞下来。没有实现我们想要达到的”渐变折叠“功能

  2. 整个组件的设计不好，当我把窗口缩小时，出现了明显的显示错误。如图

  ![image-20250818002838866](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818002838866.png)

  3. **再次重申：本系统特别注意一致性和连通性，组件的复用性，以及UI/UX的精巧设计。这因此要求你应当在进行改动时全面地审视整个平台系统的功能、组件、设计语言。同时为了保持这种一致。因此要求你实时创建或更新文档，以及更新memory，以记录解决问题的方法以及程序语言设计、组件设计，保持开发上一致性和功能间的连通性。**

- 开发时的注意事项：

  1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
  2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
  3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
  4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
  5. 开发时遵循最小开发原则
  6. 约束开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
  7. 要求开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
  8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
  9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
  10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
  11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
  12. 指定开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
  13. 特别注意使用context7获得最佳实践，使用mcp-feedback-enhanced这个mcp

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，并开始进行专项的修复。

---

# 改善7

目前项目处于开发前端原型图的阶段。

经过一轮的改善，的确对于一些问题有了改善。经过我对整个平台的使用进行检测，仍然还是有一些问题没有改善。因而依旧的，单独就每个页面或每个功能提出相关的问题，或是改善建议，落实到你那里则应当成为这轮对话改善的任务：

- 「AI智能助手页」：
  1. 之前我要求制作一个悬浮的小按钮，类似小助手的形象，可以简要与其对话。目前这个小按钮的功能实现的挺好的，但是无法收放，无法关闭或者重新变成小球模样、显示逻辑有误、无法拖动，和AI智能助手页不够连通。
- 「案件详情」（路由cases/case-002）：
  1. 点击按钮“编辑案件”无法做到真正编辑案件
  2. 点击按钮“案件操作与文书”后显示的“操作目录”中的“管辖异议jurisdiction功能”、“变更仲裁请求change-request功能”、“变更代理人change-agent功能”还在开发。**同样的，把这个平台系统中所有“待开发”的功能全部实现。**
  3. 我希望目前案件的进展是可以根据我完成相应的任务变动的。
- 「在线庭审」（路由/hearing/online）：
  1. 现在的隔离方式很好，为我设置一个演示的庭审码
  
- 「等候室」（路由/hearings）：

  1. 同样的，现在的隔离方式很好，为我设置一个演示的等候室，我来调整一下相关的界面和功能

- 「文档详情页」（路由documents/1）：

  1. 目前文档备注无法真正将备注添加到历史备注中。为了前端原型的完备，实现这个功能

- 「调解案件详情页」（路由/mediation/med-001/manage）：

  1. 点击按钮“安排会议”和“发送通知”，真的可以预约日程以及发送通知吗？
  2. 区域“参与者管理”点击按钮“添加参与者”无效，说明相关页面未开发，应当开发。
  3. 区域“参与者管理”下的人员卡片，点击按钮“修改”无反应，说明相关功能也没有开发
  4. 区域“会议管理”未开发
  5. 区域“文档管理”未开发

- 「日程安排页」（路由/schedule）：

  1. 目前的泳道图日历表还是有点问题，例如没有按照时间安排而是按照事件安排，以及所谓切换“泳道视图”、“日历视图”、“今日日程”、“即将到来”、“提醒管理”无反应

- 另外

  1. 出现在每一个选项的动画问题仍然存在，例如这个元素：

  <button type="button" role="combobox" aria-controls="radix-_r_25_" aria-expanded="false" aria-autocomplete="none" dir="ltr" data-state="closed" data-slot="select-trigger" data-size="default" class="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 w-32"><span data-slot="select-value" style="pointer-events: none;">全部状态</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down size-4 opacity-50" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>

  aria-expanded和data-state两个元素变化之后，引起的选项框仍然是从左上角飞下来。没有实现我们想要达到的”渐变折叠“功能

​	2. 整个组件的设计不好，当我把窗口缩小时，出现了明显的显示错误。如图

![image-20250818002838866](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818002838866.png)

	3. **再次重申：本系统特别注意一致性和连通性，组件的复用性，以及UI/UX的精巧设计。这因此要求你应当在进行改动时全面地审视整个平台系统的功能、组件、设计语言。同时为了保持这种一致。因此要求你实时创建或更新文档，以及更新memory，以记录解决问题的方法以及程序语言设计、组件设计，保持开发上一致性和功能间的连通性。**

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，并开始进行专项的修复。

注意无需每次修改之前或之后向我寻求确认，持续完成全部任务之后让我来进行相关测试。

---

# 改善8

现在，请你学习@docs文件夹中的文档，rules的全部规则特别是名为FIRST-RULE的规则，以及memory中对于该项目情况的介绍，在使用mcp的情况下，全面且深刻地把握这个项目，理解目前项目处于开发前端原型图的阶段。

之后，我开始就整个平台的使用进行检测，单独就每个页面或每个功能提出相关的问题，或是改善建议，落实到你那里则应当成为这轮对话改善的任务：

- 「仪表盘」（路由/dashboard）：
  1. 仪表盘中的区域“AI待办中心”对于各个部分的对接还不够灵活，还不能通过这里进入到其他卡片
  2. 右上角区域“通知”显示的待办案件数量和通知数量还不够灵活变换，如今显示只有两个，但是全部已读之后仍然还是两个，无法顺利切换
  3. 右上角区域“通知”与其他窗口以及功能模块还不够连通，不能通过这里跳转到其他页面
  
- 「AI智能助手页」：
  1. 目前悬浮小助手无法通过收放丝滑切换球状悬浮和窗口状态，无法正确关闭、显示逻辑有误、无法拖动，和AI智能助手页不够连通。
  1. 无法通过点击右上角的按钮“使得AI智能助手”显示或消失
  
- 「案件管理」（路由/cases）：

  1. 该部分的选项“排序方式”和选项按钮“更多筛选”应当处于同一高度，保持每个管理页面的页面布局是一致统一的
  
- 「等候室」（路由hearings/hearing-case-002/waiting）

  1. 等候室应当是进入庭审的前置环节，无论是仲裁庭审还是调解庭审。在庭审开放之前，必须进入等候室。
  2. 等候室的页面应当和「庭审页面」保持一致，无论是流程还是方式——这是因为等候室是作为庭审环节的，可选的前置环节存在的
  
- 「在线仲裁庭审」（路由/hearing/online）：

  1. 目前的视频页面还比较简陋，没有对仲裁或者调解程序的梳理
  2. 没有给仲裁员、双方当事人的视频界面设计。这一点比较重要，希望你能重要设计。
  
- 「调解申请」（路由/mediation/apply）：

  1. 区域“调解申请表”的区域“调解申请表”有案件信息选项“关联案件”需要关联到现有的仲裁案件——同样的，现有的调解案件也要关联到仲裁申请的地方，做到双边互通互联一致
  
- 「调解管理」（路由/mediation/management）：

  1. **这是一个非常大的功能模块，需要非常独立，非常完整。**从这个角度出发，我们再来梳理一下：
     1. 调解申请部分，参照仲裁程序。当然现在的也很好了。在调解发起之后，应当发送调解协议确认，双方当事人可在线查看并确认，若有异议则提出修改意见，调解员进行调整；若双方均无异议，在线签署调解协议。
     2. 调解申请的调解员应当和金融机构对接，以保证调解的法律效力。
     3. 三个卷宗：调解前中和司法确认的电子卷宗、纸质卷宗和电子印章，要跟随时间线的记录，有时间轴
     4. 双方当事人达成调解协议后，可通过系统向法院提交司法确认申请，填写申请信息，上传调解协议及相关证据材料。法院审核完成后，通过系统向当事人反馈审核结果。若审核通过，生成司法确认裁定书；若审核不通过，说明理由，案件可重新调解或转入诉讼。——**因此我们要设计一个通向法院的接口**——系统将司法确认裁定书电子版送达至双方当事人，当事人可在线查看或下载打印
     5. 每一个步骤都应当参照仲裁程序，有相应的时间线体现和归档
  2. 若一方当事人未履行司法确认后的调解协议或生效判决，另一方当事人可通过系统向法院提交执行申请，填写执行请求、被执行人信息等，并上传相关法律文书。
     1. 调解程序目的是获得法院的强制执行法律效力，从而走强制执行。**因此调解流程之后应当紧密跟随强制执行程序**
     2. 强制执行程序的法律效力一方面来源于向法院的确认，一方面来源于公证处的对接——**因此在全平台的环节，还要设计一个公证处参与的切口**
     3. 法院执行人员在系统中记录执行过程，包括执行措施、财产调查情况、执行进展等信息。当事人可通过系统查询执行进度。
     4. 执行完成后，法院执行人员在系统中录入执行结果，如执行到位金额、执行终结原因等，并将结果反馈给申请人。
  3. 再次重复，**这是一个非常大的功能模块，需要非常独立，非常完整。**你应当用心开发这一部分。
  
- 「仲裁员库」（路由/arbitrators/arb-002）

  1. 按钮「发送消息」和按钮「预约咨询」一定要和消息页连通。虽然前端无法实现这个功能，这需要后端配合进行，但写在这里作为一个提醒。

- 「智能文书生成」（路由documents/generate）

  1. 这里的文书生成应当借鉴官方近些年起诉状、答辩状的标准格式，为

- 「日程安排页」（路由/schedule）：

  1. 目前的泳道图日历表还是有点问题，例如没有按照时间安排而是按照事件安排，以及所谓切换“泳道视图”、“日历视图”、“今日日程”、“即将到来”、“提醒管理”无反应
  2. 卡片“日历”和目前的泳道图卡片是冲突的，用心思考一下也能明白。
  3. 卡片“泳道图”不能只有日期，横列不能是“仲裁庭审”、“调解会议”、“资讯会议”、“文档审查”，而应该是时间，这样配合才能正确显示
  4. **这个功能改了非常多次，因此这个问题非常严重，应当要重点修缮。**

- 另外

  1. 出现在每一个选项的动画问题仍然存在，例如这个元素：

  <button type="button" role="combobox" aria-controls="radix-_r_25_" aria-expanded="false" aria-autocomplete="none" dir="ltr" data-state="closed" data-slot="select-trigger" data-size="default" class="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 w-32"><span data-slot="select-value" style="pointer-events: none;">全部状态</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down size-4 opacity-50" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg></button>

  aria-expanded和data-state两个元素变化之后，引起的选项框仍然是从左上角飞下来。没有实现我们想要达到的”渐变折叠“功能

​	2. 整个组件的设计不好，当我把窗口缩小时，出现了明显的显示错误。如图

![image-20250818002838866](C:\Users\HP\AppData\Roaming\Typora\typora-user-images\image-20250818002838866.png)

3. **再次重申：本系统特别注意一致性和连通性，组件的复用性，以及UI/UX的精巧设计。这因此要求你应当在进行改动时全面地审视整个平台系统的功能、组件、设计语言。同时为了保持这种一致。因此要求你实时创建或更新文档，以及更新memory，以记录解决问题的方法以及程序语言设计、组件设计，保持开发上一致性和功能间的连通性。**

我上述描述的全部都是应当整改的内容。请你梳理之后罗列并且建立相关任务，并开始进行专项的修复。

注意无需每次修改之前或之后向我寻求确认，持续完成全部任务之后让我来进行相关测试。

---

# 需求文档

现在我将要根据目前项目的情况，收集整理一份项目的需求以及参数文档。该需求和参数文档主要用于为该项目后续开发后端、APP端、小程序端，以及为这整个生态项目总结预算使用。在撰写时需要注意：

1. 需求以及参数文档应当完全基于目前原型开发的代码，以及docs文档中的文件记载内容，结合memory中记载的事项综合生成，旨在从前端逆推整个项目的情况，做到阶段性的总结。
1. 需求以及参数文档务必要完全，一定要涵盖我们本次项目需要完成的所有功能模块、需求、UI/UX设计语言、技术栈、代码设计语言、数据流等，务必做到完全
1. 文档应当参照前端原型目前要完成以及已经完成的各项功能模块，模拟或实际记载具体的内容
1. 文档在整理过程中应当适当调整，使得整个项目的需求参数保持一致、统一、完美，做到整理文档的过程中对整个项目再进行一次检视，以做到没有任何歧义和问题遗留
1. 需求以及参数文档应当作为主要用于为该项目后续开发后端、APP端、小程序端，以及软件参数和招投标使用——这一个目的务必要牢记于心，保证文档的专业性
1. 整理出的所有文档依然放置在docs文档当中。

需求以及参数文档完工后，请你为了该项目后续开发后端、APP端、小程序端，以及为这整个生态项目总结预算使用的目的，再撰写相关UML图表，以全面并且形象地展示出该项目的全貌。

注意日期标注2025年8月22日完成，署名方寒，此版为Version 0.5

开发团队只有一人，即方寒。

---

# 新开

我打算开发一款在线商事仲裁平台。涵盖中华人民共和国仲裁法约定的基本程序，同时载有在线视频会议程序仲裁、AI智能助手、批量仲裁案件输入、在线仲裁案情查看、格式文本生成、仲裁和调解两程序互相转换的等功能。

现在，让我们基于 @docs @docs 描述的该项目已有的功能以及内容，特别是对仲裁程序拆解之后应当遵循的规则，参考我给你的视频中所展示的，市面上已有的仲裁平台的样式，来思考我想打造的，拥有这些很好的功能的平台应当具有的样式、技术栈以及页面结构等内容。

我初步对这个平台开发的想法是：

1. 使用前端nextjs+tailwand CSS+typescript+shadcn/ui+Zustand；后端使用nodejs+postgre+redis；
2. 主色调橙色+白色，卡片式设计，完全响应式设计，风格清爽、明亮、易于阅读和操作，富含设计语言，应当作为一个高级设计师进行设计
   3.一定要体现AI的驱动赋能，AI应当驱动仲裁人使用平台、完善信息、提交信息；辅助仲裁员进行案件梳理、信息记录、拆解仲裁信息、调控仲裁程序
3. 视频环节应当现代、易读、亲近，同时体现仲裁的程序，按照程序进行。给予仲裁员以及仲裁人在仲裁全程的互动渠道，使得整个仲裁更加生动
4. 应当注意这个仲裁平台是作为一个叫“LegalMind”大产品生态的一部分，这个产品生态的另外一个产品如截图所示。为了保证整个生态的一致，应当在开发该款产品的时候将主题和风格统一。

AI赋能也可以作为辅助裁判，帮助仲裁员获得仲裁信息，辅助仲裁流程。

现在，我想请你以一个高级架构师开发者的角度，去了解并熟悉这个项目

再次重申几个注意事项：

1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
5. 开发时遵循最小开发原则
6. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
7. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
12. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
13. 指定大模型使用context7和mcp-feedback-enhanced这个mcp

我希望你能深刻地把握到目前的情况，然后去：

1. 补全并完善所有文档中的信息，保持它们内容上的一致性，以及和项目目前的情况对齐
2. 将相关信息补充到你的memories当中

----

# 开始完善后端

我打算开发一款在线商事仲裁平台。涵盖中华人民共和国仲裁法约定的基本程序，同时载有在线视频会议程序仲裁、AI智能助手、批量仲裁案件输入、在线仲裁案情查看、格式文本生成、仲裁和调解两程序互相转换的等功能。

我初步对这个平台开发的想法是：

1. 使用前端nextjs+tailwand CSS+typescript+shadcn/ui+Zustand；后端使用nodejs+postgre+redis；
2. 主色调橙色+白色，卡片式设计，完全响应式设计，风格清爽、明亮、易于阅读和操作，富含设计语言，应当作为一个高级设计师进行设计

   3.一定要体现AI的驱动赋能，AI应当驱动仲裁人使用平台、完善信息、提交信息；辅助仲裁员进行案件梳理、信息记录、拆解仲裁信息、调控仲裁程序

3. 视频环节应当现代、易读、亲近，同时体现仲裁的程序，按照程序进行。给予仲裁员以及仲裁人在仲裁全程的互动渠道，使得整个仲裁更加生动
4. 应当注意这个仲裁平台是作为一个叫“LegalMind”大产品生态的一部分，这个产品生态的另外一个产品如截图所示。为了保证整个生态的一致，应当在开发该款产品的时候将主题和风格统一。


现在，请你学习 @docs 与 @docs 文件夹中的文档，rules的全部规则特别是名为FIRST-RULE的规则，以及memory中对于该项目情况的介绍，在使用mcp的情况下，全面且深刻地把握这个项目，理解目前项目处于开发前端原型图的阶段。

AI赋能也可以作为辅助裁判，帮助仲裁员获得仲裁信息，辅助仲裁流程。

现在，我想请你以一个高级架构师开发者的角度，去了解并熟悉这个项目

再次重申几个注意事项：

1. 需求和功能应当满足我们之前对话的所有内容，符合仲裁在线程序和规则，特别是要体现在线视频调解环节
2. UI/UX界面一定要创新，要现代、简洁、高级，给人以Aha的视觉感受。在设计UI/UX时特别参照我后面会提供给大模型的图片，保持主题和风格的统一
3. 技术栈应当指明，并且要求大模型通过context7学习到技术应用的最佳实践
4. 应当注意，该产品是作为一个叫LegalMind的法律服务工具生态的一部分，保持主题和内容的一致，并且在开发的过程中也要注意各个生态中产品的互通性
5. 开发时遵循最小开发原则
6. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
7. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
8. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
9. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
10. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
11. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
12. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
13. 指定大模型使用context7和mcp-feedback-enhanced这个mcp


我希望你能深刻地把握到目前的情况，然后去：开发这个项目的后端。

也就是说，请你了解分析这个项目的近况之后，开始在原本文档描述以及功能模块的对应之下，开发项目相关的后台内容，将这个项目正式完善起来。

因此，不要嫌我啰嗦，我还是想提醒你：请在对这个项目完全的了解之后，开始规划如何将后端完善，设置相关的全面的、完整的、详细的、一致的计划，开始进行工作。

---

# 后端开发注意1

确认继续创建。
同时创建过程中需要注意：不需要向我确认任何任务的进行或者进展现状，只管继续开发。
而在开发时，千万注意最小开发原则，以及我提醒你的13个开发注意事项、rules和memeory、文档的约束。
注意开发的一致性和连通性，各个功能之间要彼此连通协助，这是我们这个项目系统的核心。

特别的，需要留有接口给后续AI系统全方面驱动接手、公证系统的接入、法院数据系统的接入。

----

# 后端开发注意2

太好了！请你现在整体检查一下，如今的后端开发情况如何？是否符合我们的业务功能要求？是否便于修改？是否存在设计语言不一致、组件冗余、复用性差、数据库表与业务需求不一致等情况？是否存在无法接入AI业务功能、无法接入LegalMind其他生态平台、软件、安卓IOS小程序的情况？
这个检查要从高屋建瓴的角度出发，同时要落实到每一行代码。

---

# 后端开发注意3

非常好！非常感谢你的帮助！

我看到你的task list中还有很多任务没有完成，请你仔细检查这些任务都完成了吗？给完成的任务标注。

---

# 后端开发注意4

太棒了！你已经完成了后端开发第一阶段的所有工作。

现在让我们来用全力去更新我们的docs文档和memories。

特别是docs文档，应当要涵盖数据库设计的全部内容，api设计的全部内容，以及后端开发的技术栈、模块开发以及等等能够便于后续开发，添加模块功能的指引和说明文档。

---

# 画布开发

下一步我们不干这个

现在我们转向这个项目中一个非常重要的交互重置，也是对功能规划的重新设计。
关于这项工作的相关内容，以及最新进度，已经记录在了文档以及文件夹中
同样为了检测你是否认真领会了目前项目的进展，请你研究并找出这项工作是什么

---

# 画布开发2

我要说明：

1. 这个画布基于仓库[plait-board/drawnix: 开源白板工具（SaaS），一体化白板，包含思维导图、流程图、自由画等。All in one open-source whiteboard tool with mind, flowchart, freehand and etc.](https://github.com/plait-board/drawnix)
   在语言上，最大可能地与目前的技术栈进行融合，最大可能避免进行技术迁移
2. 这个工作台的需求和功能旨在将以“庭审功能”、“AI功能”包含在内的有可能进行改善的功能进行囊括——旨在将原本枯燥不直观的法律活动革新为操作性强、符合法律人显示工作逻辑的工作台逻辑
3. 这个工作台应当具有良好的在线更新功能，实现团队协作——参照Figma
4. 这个工作台的组件应当和我们项目的组件保持一致，保持主题和风格的统一
5. 要求大模型通过context7学习到技术应用的最佳实践
6. 应当注意，开发的过程中一定要注意各个生态中产品的互通性——**这个工作台会重新复用在任何这个生态中各个产品之中，同时和各个产品其中的各个功能也是极其连通的**
7. 开发时遵循最小开发原则
8. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
9. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
10. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
11. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
12. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
13. 根文件夹的文件夹 docs 装放文档、文件夹 Prototype 装放app原型图、文件夹 rules 装放指导你进行工作的rule、文件夹 prompt 装放指导这次工作的prompt内容、 文件夹 dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了
14. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
15. 指定大模型使用context7和mcp-feedback-enhanced这个mcp

我们的目标是把这个画布开发成一个：**生态的创新核心**



# 十六项原则：

1. 这个画布基于仓库[plait-board/drawnix: 开源白板工具（SaaS），一体化白板，包含思维导图、流程图、自由画等。All in one open-source whiteboard tool with mind, flowchart, freehand and etc.](https://github.com/plait-board/drawnix)
   在语言上，最大可能地与目前的技术栈进行融合，最大可能避免进行技术迁移
2. 这个工作台的需求和功能旨在将以“庭审功能”、“AI功能”包含在内的有可能进行改善的功能进行囊括——旨在将原本枯燥不直观的法律活动革新为操作性强、符合法律人显示工作逻辑的工作台逻辑
3. 这个工作台应当具有良好的在线更新功能，实现团队协作——参照Figma
4. 这个工作台的组件应当和我们项目的组件保持一致，保持主题和风格的统一
5. 要求大模型通过context7学习到技术应用的最佳实践
6. 应当注意，开发的过程中一定要注意各个生态中产品的互通性——**这个工作台会重新复用在任何这个生态中各个产品之中，同时和各个产品其中的各个功能也是极其连通的**
7. 开发时遵循最小开发原则
8. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。 
9. 要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
10. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
11. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
12. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
13. 根文件夹的文件夹 @docs 装放文档、文件夹 @Prototype 装放工作台原型、文件夹 @rules 装放指导你进行工作的rule、文件夹 @prompt 装放指导这次工作的prompt内容、 文件夹 @dev 装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了，特别是不要在Prototype文件夹中创建docs文件夹
14. 指定大模型在开发过程中遵循所有的rules，特别遵循名为FIRST-RULE的rule
15. 指定大模型使用context7和mcp-feedback-enhanced这个mcp
16. 指定使用chrome-devtools进行调试

---

# 功能最终优化1

1. 如图，目前画布各个组件大小搭配不均衡，使得操作空间极小，需要调整一下画布各个组件的大小
2. 使用ctrl + a选中所有节点之后，无法进行托拽或者其他。再点击其中一个节点无法刷新节点选中个数，仍然是三个
3. “创建法律节点”的工作栏没有什么单独存在的必要，要么统合到上方的工作栏上，要么想方法使其变得美观
4. 工作栏应当可以滑动进入画布、固定或者移动，使其更加灵活
5. 当我打开节点详情之后，节点详情提供的一些功能例如“基本信息”、“法律依据”会导致窗口随着内容多少变化，无法统一。统一窗口大小以及内容展示
6. 此前我要求的参照figma、飞书画板以及flowith操作台的功能：例如右键画布生成节点或添加聊天对话贴等等，选中两个节点进行AI功能接入等等，都没有在目前的工作台中体现，减少了很大程度工作台的“智能感”和“便利感”
7. 依然是如图，节点显示字体的大小不一、字体的样式不一，统一节点的美观显示
8. 目前的多人协作功能分为对话、聊天、语音等等，其实现与我的想法并不一致。目前的实现是点开工作栏的多人写作然后进行协作，但我希望协作感能直接在画布中体现，**一切功能实现以画布为中心**，多人可以在画布中直接创建留言贴、直接框选出案件类型和语音场，并且可以看到各个协作人的鼠标移动
9. 原有的时间轴、列表功能也消失了。这个功能我是希望能够把它开发成一个视图窗口，和画布并存，帮助人们去进行案件分析
10. 画布左上角还有一个“连接数”，这是做什么的？
11. 右上角一串测试按钮没有任何用处，为什么要存在那里？可以删除吗？
12. 目前的UI设计还不够全面，功能还不够齐全，无法将文件文档、聊天对话贴到画布中，应当基于‘D:\Desktop\LegalMind-Arbitration\dev’这个项目的设计，以及整个法律工作的需求，释放想象力，再为这款工作台提供一些功能，完善一些设计

请你分析并记录我上述的需求，这些都是对于目前工作台的功能优化。特别是第12点，这需要你开动脑筋，结合我们已有的项目和法律工作的需要，从功能层面增加。

你应当继续遵从我们的16项开发原则，继续配合多个mcp，特别是使用context7和deepwiki去获得技术实现的最佳实践经验，并且学会使用chrome-devtools去进行验证，最终开发完成一个价值80000美元的法律工作台。

这是一项非常有意义的工作！

# 郝律师功能

启睿，制作一个小程序，以后专门用来给客户做数据资源保有及管理水平专项测试。测试结果在后台自动生成，经我们律所律师审核确认后，客户可以及时获取。大概是这个思路。这个小程序要嵌入我们律所的公众号和网站。

---

# 和antigravity沟通的十四项原则

学习 @docs 和 @Prototype/docs 中记载的存放在 @Prototype 下的工作台的情况，学习十四项原则： 

1. 这个画布基于仓库[plait-board/drawnix: 开源白板工具（SaaS），一体化白板，包含思维导图、流程图、自由画等。All in one open-source whiteboard tool with mind, flowchart, freehand and etc.](https://github.com/plait-board/drawnix)   在语言上，最大可能地与目前的技术栈进行融合，最大可能避免进行技术迁移 
2. 这个工作台的需求和功能旨在将以“庭审功能”、“AI功能”包含在内的有可能进行改善的功能进行囊括——旨在将原本枯燥不直观的法律活动革新为操作性强、符合法律人显示工作逻辑的工作台逻辑 
3. 这个工作台应当具有良好的在线更新功能，实现团队协作——参照Figma
4. 这个工作台的组件应当和我们项目的组件保持一致，保持主题和风格的统一
5. 要求大模型通过context7学习到技术应用的最佳实践 
6. 应当注意，开发的过程中一定要注意各个生态中产品的互通性——**这个工作台会重新复用在任何这个生态中各个产品之中，同时和各个产品其中的各个功能也是极其连通的**
7. 开发时遵循最小开发原则
8. 约束大模型开发过程中注意注重文档的撰写：在开发时始终及时更新文档，在@doc 文件夹中及时撰写readme、UI/UX文档、需求说明文档、项目进度文档、开发计划文档、技术栈文档、设计语言文档、数据流文档、问题解决文档等文档。严谨遵循最小开发原则，在每个阶段或者每个点的任务进行以及完成时，在必要的时候更新文档。  
9.  要求大模型开发过程中及时更新memory。在memory与文档冲突时，检索目前项目的全部情况，作出最妥当的思考、判断，之后行动。
10. 在每次行动之前必须学习阅读文档，基于了解的信息进行行动。
11. 阶段性、模块性开发，最小化可开发原则必须要贯彻始终，保持时刻debug，减少bug和报错存在
12. 以bug以及文档内部的报错完全消失，以及功能完全可行为一个阶段和节点结束的标志。
13. 根文件夹的文件夹 @docs  装放文档、文件夹 @Prototype  装放工作台原型、 文件夹 @dev  装放项目的实际运行内容——不要弄乱了，现在这些文件夹都已经创建好了，特别是不要继续往Prototype文件夹中的docs文件夹放置文件
14. 指定大模型使用context7学习最佳技术的实践，保持一致性
