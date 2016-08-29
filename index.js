var _option = {
	ignore: [],
	fail: null,
	success: null
}

/**
 * verify 构造方法
 * @param {Object} fields [验证元素（规则）]
 * @param {Object} option [配置选项]
 */
var Verify = function (fields, option) {
	return new Verify.prototype.VerifyInit(fields, option);
}

Verify.prototype = {
	constructor: Verify,
	//验证对象
	fields: [],
	VerifyInit: function (fields, option) {
		var me = this;
		me.option = $.extend(_option, option);

		//初始化验证对象
		function initFields(field) {
			field = $.extend({}, field);

			//共用fail 和 success 方法
			field.fail = me.option.fail;
			field.success = me.option.success;

			field.rules = me.toArr(field.rules);
			me.fields.push(new Verify.Field(field, me.option));
		}

		fields = me.toArr(fields);
		for (var i = 0; i < fields.length; i++) {
			initFields(fields[i]);
		}
	},
	toArr: function (obj) {
		return $.isArray(obj) ? obj : [obj];
	},

	/**
	 * 在this.fields 里面通过条件筛选
	 * @param v {string,array} eg: 'name' or 'name,age' or ['name','age'] 需要验证的控件
	 * @param ignore {boolean} 为 false: 在this.fields筛选出 v (默认) | 为true: 在this.fields里去掉 v
	 * @returns {Array}
	 */
	getField: function (v, ignore) {
		var oldFields = this.fields,
			fields = ignore ? Array.prototype.slice.call(oldFields) : [],
			ignore = ignore || false;

		//通过 this.fields 筛选
		function name2field(list, ignore) {
			for (var i = 0; i < list.length; i++) {
				if (ignore) {
					for (var j = 0; j < fields.length; j++) {
						if (fields[j]['id'] == list[i]) {
							fields.splice(j, 1)
						}
					}
				}
				else {
					for (var j = 0; j < oldFields.length; j++) {
						if (oldFields[j]['id'] == list[i]) {
							fields.push(oldFields[j]);
							break;
						}
					}
				}
			}
		}

		if (typeof v == 'string') {
			var f = v.split(',');
			name2field(f, ignore);
		}
		else if ($.isArray(v)) {
			name2field(v, ignore)
		}
		return fields;
	},

	/**
	 * 验证函数主体，返回验证是否成功。可以验证全部。也可以验证部分
	 * @param v {string,array} eg: 'name' or 'name,age' or ['name','age'] 需要验证的控件
	 * @returns {boolean} 返回验证结果
	 */
	validate: function (v) {
		//验证主函数
		var fields,
			// 逐一验证
			stepValidate = this.option.stepValidate || false;
		if (typeof v === 'undefined') {
			//不指定验证 筛选ignore
			fields = this.getField(this.option.ignore, true);
		}
		else {
			//指定验证 不筛选ignore
			fields = this.getField(v);
		}
		var flag = true,
			//第一个出错回调函数开关
			firstFail = true;
		//逐一验证
		for (var i = 0; i < fields.length; i++) {
			if (!fields[i].verify()) {
				//第一个出错回调函数
				//   firstFail && typeof this.option.firstFail === 'function' && this.option.firstFail.call(this);
				if (firstFail) {

					(typeof this.option.firstFail === 'function') && this.option.firstFail.call(this, fields[i]);
					firstFail = false;
				}
				// 逐一验证
				if (stepValidate) {
					return false;
				}

				flag = false;
			}
		}
		//释放缓存
		fields = null;
		return flag;
	}
}
Verify.prototype.VerifyInit.prototype = Verify.prototype;

//初始化模板。工具函数
Verify.renderTemp = function (temp, data) {
	var temp = temp.replace(/\{\{[a-zA-Z]+\}\}/gi, function (a) {
		var b = a.replace(/\{\{|\}\}/gi, "");
		return data[b];
	});
	return temp;
};



/**
 * 验证方法对象
 * @type {Object}
 */
Verify.validateMethod = {
	ajax: function (txt, obj) {
		if (obj.url) {
			var key = obj.key || 'data';
			var data = {};
			data[key] = txt;
			if (obj.data) {
				$.extend(data, obj.data);
			}
			if (obj.dataEl) {
				//dataEl -> 附带文本ID   "#id",  考虑到数据会变化
				var dataEl = {};
				$.extend(dataEl, obj.dataEl);
				for (var k in dataEl) {
					dataEl[k] = $.trim($(dataEl[k]).val());
				}
				$.extend(data, dataEl);
			}
			var msg = $.ajax({
				type: "post",
				url: obj.url,
				data: data,
				async: !1
			}).responseText;
			var msgObj = JSON.parse(msg);
			if (typeof msgObj == "boolean") {
				return msgObj;
			}
			else {
				if (msgObj.msg) {
					obj.msg = msgObj.msg;
				}
				return msgObj.success;
			}
		}
		else {
			return false;
		}
	},
	regexp: function (txt, obj) {
		if (Object.prototype.toString.call(obj.regexp) === "[object RegExp]") {
			return obj.regexp.test(txt);
		}
		else {
			return false;
		}
	},
	fn: function (txt, obj) {
		if (Object.prototype.toString.call(obj.fn) === "[object Function]") {
			return obj.fn(txt);
		}
		else {
			return false;
		}
	},
	required: function (txt, obj) {
		return !!$.trim(txt)
	},
	min: function (txt, obj) {
		return txt.length >= ~~obj.length
	},
	max: function (txt, obj) {
		return txt.length <= ~~obj.length
	},
	range: function (txt, obj) {
		//eg '1:3'
		var a = obj.range.split(":");
		var b = txt.length;
		return b >= ~~a[0] && b <= ~~a[1]
	},
	rangeVal: function (txt, obj) {
		//eg '1:3'
		var a = obj.rangeVal.split(":");
		var b = Number(txt);
		if (a.length == 1) {
			return b >= ~~a[0]
		}
		else if (a.length == 2) {
			return b >= ~~a[0] && b < ~~a[1]
		}
		return false;
	},
	email: function (txt, obj) {
		return /^[a-zA-Z0-9_\.\-]+\@([a-zA-Z0-9\_\-\u4e00-\u9fa5]+\.)+[a-zA-Z0-9]{2,4}$/.test(txt)
	},
	phone: function (txt, obj) {
		return /^\d{3,4}-\d{7,8}(-\d{3,4})?$/.test(txt)
	},
	tel: function (a) {
		//???
		//a = a.p;
		//return RegExp("^(" + a + ")\\d{" + (11 - a.split("|")[0].length) + "}$").test(me.txt)
	},
	chinese: function (txt, obj) {
		return /^[\u4E00-\u9FA5\uf900-\ufa2d]+$/.test(txt)
	},
	equal: function (txt, obj) {
		return txt == $('[name=' + obj.equal + ']').val()
	},
	less: function (txt, obj) {
		var b = Number(txt);
		if (!b || !obj.than) {
			return false;
		}
		else {
			return b < Number($(obj.than).val())
		}
	},
	big: function (txt, obj) {
		var b = Number(txt);
		if (!b || !obj.than) {
			return false;
		}
		else {
			return b > Number($(obj.than).val())
		}
	},
	PhoneOrTel: function (txt, obj) {
		return /(^(\d{3,4}-)?\d{7,8})$|(1[0-9]{10})/.test(txt)
	},
	passwrod: function (txt, obj) {
		return /[^\u4e00-\u9fa5]+$/.test(txt)
	},
	ChOrEn: function (txt) {
		return /^[\u4E00-\u9FA5\uf900-\ufa2da-zA-Z]+$/.test(txt)
	},
	int: function (txt) {
		return /^[0-9]+$/.test(txt);
	},
	fint: function (txt) {
		return /^\-[0-9]+$/.test(txt);
	},
	money: function (txt) {
		return /^[\d]*(?:\.?[\d]{0,2})?$/.test(txt) && Number(txt) > 0;
	},
	number: function (txt) {
		return /^\d+$/.test(txt);
	},
	username: function (txt) {
		return /^([\u4E00-\u9FA5]|[a-zA-Z]|\s){1,50}$/.test(txt);
	},
	nickname: function (txt) {
		var digit_reg = /^\d+$/;
		if (digit_reg.test(txt)) {
			return false;
		}
		return /^([\u4E00-\u9FA5]|[a-zA-Z]|\d|\_){4,20}$/.test(txt);
	}
}


Verify.failMessage = {
	ajax: '格式不正确',
	regexp: '格式不正确',
	fn: '格式不正确',
	required: '必填选项',
	min: '长度不足',
	max: '超过最大长度',
	range: '不在范围中',
	email: '邮箱格式不正确',
	phone: '手机格式不正确',
	tel: '电话格式不正确',
	chinese: '必须为中文字符',
	equal: '两次输入的值不同',
	PhoneOrTel: '邮箱或电话格式不正确',
	passwrod: '密码格式不正确',
	ChOrEn: '必须为中文或英文字符',
	number: '必须为数字',
	username: '必须为1-20个字符的汉字或字母',
	nickname: '4-20位字符(汉字、数字和字母)',
	money: '请输入正确金额，最多两位小数且大于零'
}


//增加验证方法
Verify.addValidateMethod = function (name, fun, msg) {
	if (name in Verify.validateMethod) {
		return false;
	}
	Verify.validateMethod[name] = fun;
	Verify.failMessage[name] = msg;
}

/**
 * 验证对象
 * @param {Object} obj 验证的规则
 */
Verify.Field = function (obj, option) {
	//id
	this.id = obj.el;
	var pre = obj.el.slice(0, 1);
	var selector = ''

	if (pre == '#' || pre == '.') {
		this.$el = $(obj.el);
		selector = obj.el;
	}
	else {
		this.$el = $('[name=' + obj.el + ']');
		selector = '[name=' + obj.el + ']';
	}
	//jquery 对象

	//触发验证的event
	this.evt = obj.evt || '';
	//验证规则
	this.rules = obj.rules || [];
	//失败回调函数
	this.fail = obj.fail || null;
	//成功回调函数
	this.success = obj.success || null;
	//验证通过后是否跳过验证
	this.isPass = obj.isPass || false;
	//验证过则跳过验证
	this.pass = false;
	//option
	this.option = option;

	var me = this;
	me.$el.bind('change', function () {
		me.pass = false;
	});

	//绑定验证函数
	if (obj.evt) {
		$(document.body).delegate(selector, obj.evt, function () {
			var ignore = me._getIgnore();
			//不存在忽略选项时验证
			if ($.inArray(me.id, ignore) == -1) {
				me.verify();
			}
		});
	}
}

Verify.Field.prototype = {
	constructor: Verify.Field,

	/**
	 * 获取忽略的ignore
	 */
	_getIgnore: function () {
		var ignore = this.option.ignore;
		if (typeof ignore == 'string') {
			ignore = ignore.split(',');
		}
		return ignore;
	},

	/**
	 * 根据规则验证是否通过
	 * @return {Boolean} 是否验证通过
	 */
	verify: function () {
		var me = this,
			rules = me.rules,
			$el = me.$el;

		if (me.isPass && me.pass) {
			return true;
		}

		//找到单个元素
		if ($el.length == 1) {
			var txt = $el.val();
			return me.verifyForRules(txt, rules);
		}
		else if ($el.length > 1) {
			//找到多个元素
			if ($el.is(':checkbox') || $el.is(':radio')) {
				//如果是checkbox 或者 radio
				var txtList = [],
					txt;
				$el.filter(':checked').each(function () {
					txtList.push($(this).val());
				});
				txt = txtList.join(',');
				return me.verifyForRules(txt, rules);
			}
			else {
				var flag = true;
				//如果是其他元素，侧循环验证
				$el.each(function () {
					var txt = $(this).val();
					if (!me.verifyForRules(txt, rules)) {
						flag = false;
						return false
					}
				});
				return flag;
			}
		}
		else {
			//没有找到元素
			return false;
		}
	},
	/**
	 * 验证失败 调用失败回调函数
	 * @param  {String} type 验证类型 
	 * @param  {String} msg  失败信息
	 */
	verifyFail: function (type, msg) {
		this.pass = false;
		this.fail && this.fail.call(this, this.id, type, msg, this.$el);
	},
	/**
	 * 验证成功 调用成功回调函数
	 */
	verifySuccess: function () {
		this.pass = true;
		this.success && this.success.call(this, this.id, this.$el);
	},
	/**
	 * 根据规则验证
	 * @param txt {string} 验证字符串
	 * @param rules {Array} 验证规则数组
	 * @returns {boolean}
	 */
	verifyForRules: function (txt, rules) {
		var me = this,
			vMethod = Verify.validateMethod,
			vMsg = Verify.failMessage,
			flag = true;

		for (var i = 0; i < rules.length; i++) {
			var rule = rules[i];
			//验证类型
			var type = rule.type;
			if (type in vMethod) {
				if (!vMethod[type](txt, rule)) {
					flag = false;
					var msg = rule.msg || vMsg[type];
					me.verifyFail(type, msg);
					return false;
				}
			}
			else {
				flag = false;
				me.verifyFail(type, 'error: not find rule');
				return false;
			}
		}
		if (flag) {
			//验证通过
			me.verifySuccess();
			return true;
		}
	}

}

module.exports = Verify;