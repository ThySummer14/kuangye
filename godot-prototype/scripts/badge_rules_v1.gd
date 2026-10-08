extends RefCounted
# Archived rule revision. Future catalogue wording must not rewrite old attempts.
const REVISION="main-764e83d-text-v1"
const NOVEL={"version":2,"album":"lifetime","operationId":"life-novel","title":"自己写一本小说","objective":"写完一本属于自己的小说，让故事走到结尾。"}
const FIELD={"version":1,"album":"challenger","operationId":"field-study","title":"实地求证","objective":"选一个身边的真实问题，实地观察三处公共地点，整理至少 12 条发现和一份 600 字调查结论。","baseRating":4,
	"terms":[{"id":"evidence","title":"可追溯","weight":1,"condition":"为每条发现记录地点、日期和观察依据。"},
	{"id":"interview","title":"听另一面","weight":2,"condition":"征得同意后访谈两位相关的人，保留匿名摘记。"},
	{"id":"revisit","title":"二次求证","weight":3,"condition":"另一天重访三个地点，验证结论并写出变化。"}]}
