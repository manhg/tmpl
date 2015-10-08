if (typeof tmpl === 'undefined') {
  var
    expect = require('expect.js'),
    tmpl = require('tmpl').tmpl,
    brackets = require('tmpl').brackets
}

describe('brackets', function () {

  var data = {
    yes: true,
    no: false,
    x: 2,
    str: 'x'
  }

  // send 1 or 2 in 'err' to enable internal information
  function render(str) {
    return tmpl(tmpl.parse(str), data)
  }
  function setBrackets(s) {
    brackets.set(s)
  }
  function resetBrackets() {
    brackets.set()
  }
  function bracketPair() {
    return brackets(0) + ' ' + brackets(1)
  }

  // reset brackets to defaults
  after(resetBrackets)
  beforeEach(resetBrackets)
  resetBrackets()

  it('default to { } if setting to undefined, null, or an empty string', function () {
    var ab = [null, '']
    for (var i = 0; i < 3; ++i) {
      setBrackets(ab[i])
      expect(bracketPair()).to.equal('{ }')
      expect(render('{ x }')).to.equal(2)
    }
  })

  //// custom brackets
  it('single and multi character custom brackets', function () {

    // single character brackets
    brackets.set('[ ]')
    expect(bracketPair()).to.equal('[ ]')
    expect(render('[ x ]')).to.equal(2)
    expect(render('[ str\\[0\\] ]')).to.equal('x')

    // multi character brackets
    setBrackets('{{ }}')
    expect(bracketPair()).to.equal('{{ }}')
    expect(render('{{ x }}')).to.equal(2)

    // asymmetric brackets
    setBrackets('${ }')
    expect(bracketPair()).to.equal('${ }')
    expect(render('${ x }')).to.equal(2)
  })

  describe('using brackets inside expressions', function () {

    it('brackets in expressions can always be escaped', function () {
      expect(render('{ "\\{ 1 \\}" }')).to.equal('{ 1 }')
      expect(render('\\{ 1 }')).to.equal('{ 1 }')
      expect(render('{ "\\}" }')).to.equal('}')
      expect(render('{ "\\{" }')).to.equal('{')
    })

    it('though escaping is optional', function () {
      expect(render('{ JSON.stringify({ x: 5 }) }')).to.equal('{"x":5}')
      expect(render('a{ "b{c}d" }e { "{f{f}}" } g')).to.equal('ab{c}de {f{f}} g')

      // for custom brackets as well
      setBrackets('[ ]')
      expect(render('a[ "b[c]d" ]e [ "[f[f]]" ] g')).to.equal('ab[c]de [f[f]] g')

      setBrackets('{{ }}')
      expect(render('a{{ "b{{c}}d" }}e {{ "{f{{f}}}" }} g')).to.equal('ab{{c}}de {f{{f}}} g')

      //setBrackets('<% %>')
      //expect(render('a<% "b<%c%>d" %>e <% "<%f<%f%>%>" %> g')).to.equal('ab<%c%>de <%f<%f%>%> g')

      setBrackets('[[ ]]')
      expect(render('a[[ "b[[c]]d" ]]e [["[[f[f]]]"]]g[[]]')).to.equal('ab[[c]]de [[f[f]]]g')
    })

  })

  describe('2.2.3', function () {

    //// Better recognition of nested brackets, escaping is almost unnecessary.
    //// (include escaped version for compatibility)

    describe('escaping is almost unnecessary', function () {

      // ...unless you're doing something very special?
      it('no problem with brackets inside strings', function () {
        //, e.g. { "{" } or { "}" }
        expect(render('a{ "b{" }c')).to.equal('ab{c')
        expect(render('a{ "b\\{" }c')).to.equal('ab{c')
        expect(render('a{ "{b" }c')).to.equal('a{bc')
        expect(render('a{ "\\{b" }c')).to.equal('a{bc')

        expect(render('a{ "b}" }c')).to.equal('ab}c')
        expect(render('a{ "b\\}" }c')).to.equal('ab}c')
        expect(render('a{ "}b" }c')).to.equal('a}bc')
        expect(render('a{ "\\}b" }c')).to.equal('a}bc')

        expect(render('{"{"}')).to.equal('{')
        expect(render('{"\\{"}')).to.equal('{')
        expect(render('{"}"}')).to.equal('}')
        expect(render('{"\\}"}')).to.equal('}')

        expect(render('{{a:"{}}"}}')).to.eql({ a: '{}}' })
        expect(render('{{a:"{\\}\\}"}}')).to.eql({ a: '{}}' })
      })

      it('with custom brackets to "[ ]" (bad idea)', function () {
        setBrackets('[ ]')
        expect(render('[ str[0] ]')).to.be('x')
        expect(render('[ [1].pop() ]')).to.be(1)
        expect(render('a,[["b", "c"]],d')).to.be('a,b,c,d')
      })

      it('with custom brackets to "( )" (another bad idea)', function () {
        setBrackets('( )')
        expect(render('(str.charAt(0))')).to.be('x')
        expect(render('((1 + 1))')).to.be(2)
        expect(render('a,(("b"),("c")),d')).to.be('a,c,d')
      })

      it('with multi character brackets {{ }}, e.g. on "{{{a:1}}}"', function () {
        setBrackets('{{ }}')
        // note: '{{{\\}}}' generate Parse error, this equals to '{{ {\\} }}'
        expect(render('{{{ a:1 }}}')).to.eql({ a: 1 })
        expect(render('{{{a: {}}}}')).to.eql({ a: {} })
        expect(render('{{{a: {\\}}}}')).to.eql({ a: {} })
        expect(render(' {{{}}}')).to.eql(' [object Object]')
      })

      it('with multi character brackets (( ))', function () {
        setBrackets('(( ))')
        expect(render('((({})))')).to.eql({})
        expect(render('(((("o"))))="o"')).to.be('o="o"')
        expect(render('((( ("o") )))="o"')).to.be('o="o"')
      })

      // - you're using asymmetric custom brackets, e.g.: ${ } instead of { }, [ ], {{ }}, <% %>
      it('with asymmetric brackets, e.g. ${ {a:1} } instead of ${ {a:1\\} }',
        function () {
          setBrackets('${ }')
          expect(render('${ {a:1} }')).to.eql({ a: 1 })
          expect(render('${ {a:1\\} }')).to.eql({ a: 1 })
        })

      it('silly brackets? good luck', function () {
        setBrackets('[ ]]')
        expect(render('a[ "[]]"]]b')).to.be('a[]]b')
        expect(render('[[[]]]]')).to.eql([[]])

        setBrackets('( ))')
        expect(render('a( "b))" ))c')).to.be('ab))c')
        expect(render('a( (("bc))")) ))')).to.be('abc))')
        expect(render('a( ("(((b))") ))c')).to.be('a(((b))c')
        expect(render('a( ("b" + (")c" ))))')).to.be('ab)c')    // test skipBracketedPart()
      })

      it('please find a case when escaping is still needed!', function () {
        //expect(render).withArgs('{ "}" }').to.throwError()
        expect(render('{ "}" }')).to.equal('}')
      })

    })
    // end of 2.3 scaping is almost...

    it('escaped brackets, some 8 bit, iso-8859-1 characters', function () {
      var vals = [
      // source    brackets(2) + brackets(3)
      //['<% %>',  '<% %>'    ],      // angle brackets unsupported from 2.4
        ['{# #}',  '{# #}'    ],
        ['[! !]',  '\\[! !\\]'],
        ['·ʃ ʃ',   '·ʃ ʃ'     ],
        ['{$ $}',  '{\\$ \\$}'],
        ['_( )_',  '_\\( \\)_']
      ]
      var rs, bb, i

      rs = new RegExp('{x}')
      setBrackets('{ }')              // same as defaults
      expect(brackets(rs)).to.be(rs)      // must returns the same object (to.be)
      expect(brackets(0)).to.equal('{')
      expect(brackets(1)).to.equal('}')
      expect(brackets(2)).to.equal('{')
      expect(brackets(3)).to.equal('}')

      for (i = 0; i < vals.length; i++) {
        // set the new brackets pair
        rs = vals[i]
        setBrackets(rs[0])
        bb = rs[0].split(' ')
        rs = rs[1]
        expect(brackets(/{ }/g).source).to.equal(rs)
        expect(brackets(0)).to.equal(bb[0])
        expect(brackets(1)).to.equal(bb[1]); bb = rs.split(' ')
        expect(brackets(2)).to.equal(bb[0])
        expect(brackets(3)).to.equal(bb[1])
      }
    })

  })
  // end of brackets 2.2.3


  describe('2.3.0', function () {

    it('don\'t use characters in the set [\\x00-\\x1F<>a-zA-Z0-9\'",;\\]',
      function () {
        expect(setBrackets).withArgs(', ,').to.throwError()
        expect(setBrackets).withArgs('" "').to.throwError()
        expect(setBrackets).withArgs('a[ ]a').to.throwError()
        expect(bracketPair()).to.be('{ }')
      })

    it('you can\'t use the pretty <% %> anymore', function () {
      expect(setBrackets).withArgs('<% %>').to.throwError()
    })

    it('helper regex to test expression existence (insecure)', function () {
      var re = brackets(4)
      expect(re.test('{ 123 }')).to.be(true)
      expect(re.test('}{')).to.be(false)
      expect(re.test('{')).to.be(false)
      expect(re.test('\\{}')).to.be(true)
      expect(re.test('{}')).to.be(true)
    })

    it('host the precompiled value "number"', function () {
      expect(tmpl(brackets.E_NUMBER)).to.be('number')
    })

    describe('brackets.split', function () {

      it('the new kid in the town is a key function', function () {
        var
          str = '<tag att="{ a }" expr1={a<1} expr2={a>2}>\n{body}\r\n</tag>\n'

        resetBrackets()             // set brackets to default
        a = brackets.split(str)

        expect(a).to.have.length(9)
        expect(a[1]).to.be(' a ')
        expect(a[3]).to.be('a<1')
        expect(a[5]).to.be('a>2')
        expect(a[7]).to.be('body')
        expect(a[8]).to.contain('</tag>')
      })

      it('can use different brackets that current ones', function () {
        var
          str = '<tag att1="$[a]" att2=$[a<1] att3=$[a>2]>\n{body}\r\n</tag>\n',
          b = brackets.array('$[ ]'),   // get the custom brackets
          a
        resetBrackets()
        a = brackets.split(str, b)

        expect(a).to.have.length(7)
        expect(a[1]).to.be('a')
        expect(a[3]).to.be('a<1')
        expect(a[5]).to.be('a>2')
        expect(a[6]).to.contain('{body}')
      })

      it('handle single or double quotes inside quoted expressions', function () {
        var
          str = '<tag att1="{"a"}" att2={"a"} att3={\'a\'}>\'{\'a\'}\'</tag>',
          a
        resetBrackets()
        a = brackets.split(str)

        expect(a).to.have.length(9)
        expect(a[1]).to.be('"a"')
        expect(a[3]).to.be('"a"')
        expect(a[5]).to.be("'a'")
        expect(a[7]).to.be("'a'")
        expect(a[8]).to.contain('</tag>')
      })

      it('recognizes difficult literal regexes', function () {
        var n, i, str, p1 = '<p a="', p2 = '">'
        var atest = [
          [p1, '{5+3/ /}/}',          p2],  // <p a="{a+5/ /}/}">  : regex: /}/  (ok, `5+3/ re` == NaN)
          [p1, '{/[///[]}/}',         p2],  // <p a="{/[///[]}/}"> : regex: /[///[]}/
          [p1, '{/\\/[}\\]]/}',       p2],  // <p a="{/\/[}\]]/}"> : regex: /\/[}\]]/
          [p1, '{x/y}', '', '{x/g}',  p2],  // <p a="{x/y}{x/g}">  : NOT regex: /y}{x/g
          [p1, '{a++/b}', '', '{/i}', p2],  // <p a="{a++/b}{/i}"> : NOT regex: /b}{/i
          [p1, '{\'\'+/b}{/i}',       p2],  // <p a="{""+/b}{/i}"> : regex:     /b}{/i
          [p1, '{a==/b}{/i}',         p2]   // <p a="{a==/b}{/i">  : regex:     /b}{/i
        ]
        resetBrackets()

        for (n = 0; n < atest.length; ++n) {
          var a, t
          t = atest[n]
          a = brackets.split(t.join(''))
          expect(a).to.have.length(t.length)
          for (i = 0; i < t.length; ++i) {
            expect(a[i]).to.be(unq(t[i]))
          }
        }

        function unq(s) { return /^{.*}$/.test(s) ? s.slice(1, -1) : s }
      })

    })
    // end of brackets.split

  })
  // end of brackets 2.4 suite

})
