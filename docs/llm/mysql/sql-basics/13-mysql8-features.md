---
description: 尚硅谷大模型技术之MySQL · 第13章 MySQL8的新特性（可选拓展）。
---

# 第13章 MySQL8的新特性（可选拓展）

## 13.1 支持窗口函数

窗口函数也叫OLAP函数（Online Anallytical Processing，联机分析处理），可以对数据进行实时分析处理。窗口函数是每条记录都会分析，有几条记录执行完还是几条，因此也属于单行函数。

| 函数分类 | 函数                 | 功能描述                                                     |
| -------- | -------------------- | ------------------------------------------------------------ |
| 序号函数 | ROW_NUMBER()         | 顺序排序，每行按照不同的分组逐行编号，例如：1,2,3,4          |
|          | RANK()               | 并列排序，每行按照不同的分组进行编号，同一个分组中排序字段值出现重复值时，并列排序并跳过重复序号，例如：1,1,3， 1,1,1,4 |
|          | DENSE_RANK()         | 并列排序，每行按照不同的分组进行编号，同一个分组中排序字段值出现重复值时，并列排序不跳过重复序号，例如：1,1,2，1,1,1,2 |
| 分布函数 | PERCENT_RANK()       | 排名百分比，每行按照公式（rank-1）/ （rows-1）进行计算。其中，rank为RANK()函数产生的序号，rows为当前窗口的记录总行数 |
|          | CUME_DIST()          | 累积分布值，表示每行按照当前分组内小于等于当前rank值的行数 / 分组内总行数 |
| 前后函数 | LAG（expr，n）       | 返回位于当前行的前n行的expr值                                |
|          | LEAD（expr，n）      | 返回位于当前行的后n行的expr值                                |
| 首尾函数 | FIRST_VALUE（expr）  | 返回当前分组第一行的expr值                                   |
|          | LAST_VALUE（expr）   | 返回当前分组每一个rank最后一行的expr值                       |
| 其他函数 | NTH_VALUE（expr，n） | 返回当前分组第n行的expr值                                    |
|          | NTILE（n）           | 用于将分区中的有序数据分为n个等级，记录等级数                |

窗口函数的语法格式如下

```sql
函数名([参数列表]) OVER ()
函数名([参数列表]) OVER (子句)
```

over关键字用来指定窗口函数的窗口范围。如果OVER后面是空（），则表示SELECT语句筛选的所有行是一个窗口。

- ()里面可以填写分组或排序依据

  - PARTITION BY子句：按照哪些字段进行分区/分组，窗口函数在不同的分组上分别处理分析；

  - ORDER BY子句：按照哪些字段进行排序，窗口函数将按照排序后结果进行分析处理；

- WINDOW：给窗口指定一个别名；例如 window 别名1 as (窗口1定义),  别名2 as (窗口2定义)

```sql
rank() over ()
rank() over (order by salary)
rank() over (PARTITION BY did)
rank() over (PARTITION BY did order by salary)
```

```sql
#（1）在“t_employee”表中查询薪资在[8000,10000]之间的员工姓名和薪资并给每一行记录编序号
SELECT ROW_NUMBER() OVER () AS "row_num",ename,salary
FROM t_employee WHERE salary BETWEEN 8000 AND 10000;

#（2）计算每一个部门的平均薪资与全公司的平均薪资的差值。
SELECT  did,AVG(salary) OVER() AS avg_all,
AVG(salary) OVER(PARTITION BY did) AS avg_did,
ROUND(AVG(salary) OVER()-AVG(salary) OVER(PARTITION BY did),2) AS deviation
FROM  t_employee;


#（3）在“t_employee”表中查询女员工姓名，部门编号，薪资，查询结果按照部门编号分组后在按薪资升序排列，并分别使用ROW_NUMBER（）、RANK（）、DENSE_RANK（）三个序号函数给每一行记录编序号。
SELECT ename,did,salary,gender,
ROW_NUMBER() OVER (PARTITION BY did ORDER BY salary) AS "row_num",
RANK() OVER (PARTITION BY did ORDER BY salary) AS "rank_num" ,
DENSE_RANK() OVER (PARTITION BY did ORDER BY salary) AS "ds_rank_num" 
FROM t_employee WHERE gender='女';

#或

SELECT ename,did,salary,
ROW_NUMBER() OVER w AS "row_num",
RANK() OVER w AS "rank_num" ,
DENSE_RANK() OVER w AS "ds_rank_num" 
FROM t_employee WHERE gender='女'
WINDOW w AS (PARTITION BY did ORDER BY salary);


#（4）在“t_employee”表中查询每个部门最低3个薪资值的女员工姓名，部门编号，薪资值。
SELECT ROW_NUMBER() OVER () AS "rn",temp.*
FROM(SELECT ename,did,salary,
ROW_NUMBER() OVER w AS "row_num",
RANK() OVER w AS "rank_num" ,
DENSE_RANK() OVER w AS "ds_rank_num" 
FROM t_employee WHERE gender='女'
WINDOW w AS (PARTITION BY did ORDER BY salary))temp 
WHERE temp.rank_num<=3;

#或
SELECT ROW_NUMBER() OVER () AS "rn",temp.*
FROM(SELECT ename,did,salary,
ROW_NUMBER() OVER w AS "row_num",
RANK() OVER w AS "rank_num" ,
DENSE_RANK() OVER w AS "ds_rank_num" 
FROM t_employee WHERE gender='女'
WINDOW w AS (PARTITION BY did ORDER BY salary))temp 
WHERE temp.ds_rank_num<=3;


#（5）在“t_employee”表中查询每个部门薪资排名前3的员工姓名，部门编号，薪资值。
SELECT temp.*
FROM(SELECT ename,did,salary,
DENSE_RANK() OVER w AS "ds_rank_num" 
FROM t_employee
WINDOW w AS (PARTITION BY did ORDER BY salary DESC))temp 
WHERE temp.ds_rank_num<=3;

#（6）在“t_employee”表中查询全公司薪资排名前3的员工姓名，部门编号，薪资值。
SELECT temp.*
FROM(SELECT ename,did,salary,
DENSE_RANK() OVER w AS "ds_rank_num" 
FROM t_employee
WINDOW w AS (ORDER BY salary DESC))temp 
WHERE temp.ds_rank_num<=3;
```

## 13.2 通用表达式

通用表达式简称为CTE（Common Table Expressions）。CTE是命名的临时结果集，作用范围是当前语句。CTE可以理解为一个可以复用的子查询，但是和子查询又有区别，一个CTE可以引用其他CTE，CTE还可以是自引用(递归CTE)，也可以在同一查询中多次引用，但子查询不可以。

```sql
WITH [RECURSIVE]
 cte_name [(col_name [, col_name] ...)] AS (subquery)
 [, cte_name [(col_name [, col_name] ...)] AS (subquery)]
 ...
```

通用表达式以“WITH”开头，如果“WITH”后面加“RECURSIVE”就表示接下来在通用表达式中需要递归引用自己，否则就不递归引用。每一个通用表达式都需要有一个名字，它相当于是子查询结果集的名字。

```sql
#（1）在“t_employee”表中查询每个人薪资和公司平均薪资的的差值。
WITH temp AS (SELECT AVG(salary) AS pingjun FROM t_employee)
SELECT ename AS "员工姓名",
    salary AS "薪资",
    ROUND(pingjun,2) "公司平均薪资",
    ROUND(salary - pingjun,2) "差值"
FROM t_employee,temp
HAVING ABS(差值)>5000;

#（2）查询薪资低于9000的员工编号，员工姓名，员工薪资，领导编号，领导姓名，领导薪资
WITH 
emp AS (SELECT eid,ename,salary,`mid` FROM t_employee WHERE salary <9000),
mgr(meid,mename,msalary) AS (SELECT eid,ename,salary FROM t_employee)
  
SELECT eid AS "员工薪资",
	ename AS "员工姓名",
	salary AS "员工薪资",
	meid AS "领导编号",
	mename AS "领导姓名",
	msalary AS "领导薪资"
FROM emp INNER JOIN mgr ON emp.mid = mgr.meid;

#（3）查询eid为21的员工，和他所有领导，直到最高领导。
with recursive temp as (
	SELECT * FROM `t_employee` where eid = 5
	union
	select t_employee.* 
	from t_employee inner join temp
	on t_employee.eid = temp.mid
)
select * from temp;
```
