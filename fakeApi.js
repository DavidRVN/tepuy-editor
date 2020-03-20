(function(){
    var templates = [{
        id:'1',
        preview:'https://picsum.photos/400/100?t=1',
        description:"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
        createdBy:'12/02/2020',
        name:'Lorem 1',
        category:'Category 1',
        license:'GPL'
    }, {
        id:'2',
        preview:'https://picsum.photos/400/100?t=2',
        description:"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
        createdBy:'12/02/2020',
        name:'Lorem 2',
        category:'Category 2',
        license:'GPL'
    }, {
        id:'4',
        preview:'https://picsum.photos/400/100?t=3',
        description:"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
        createdBy:'13/08/2019',
        name:'Lorem 4',
        category:'Category 3',
        license:'GPL'
    }, {
        id:'5',
        preview:'https://picsum.photos/400/100?t=4',
        description:"t is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English.",
        createdBy:'15/12/2007',
        name:'Lorem 5',
        category:'Category 3',
        license:'GPL'
    }];

    var fakeApi = {
        getTemplates: function (filter) {
          return templates.filter(item => {
              var matchCat = null;
              if (filter.categories && filter.categories.length) {
                  matchCat = filter.categories.indexOf(item.category) >= 0;
              }

              var matchKeyword = null;
              if (filter.keyword && filter.keyword != '') {
                  var re = new RegExp(filter.keyword, 'i');
                  matchKeyword = re.test(item.description) || re.test(item.name)  || re.test(item.category);
              }

              return (matchKeyword == null || matchKeyword) && (matchCat == null || matchCat);
          })
        },
        getTemplateCategories: function() {
          return ['Category 1', 'Category 2', 'Category 3'];
        }
    };
    window.fakeApi = fakeApi;
})()