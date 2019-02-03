const Immutable = require('immutable');
const assert = require('assert');

/**
 * Gets distinct strings from entries and joins them into a single string,
 * flattening entries, unless the entry is on the skipList, then joins strings
 * in nested subarray while maintaining original nesting structure.
 * @param {Map <K, V>} errMap 
 * @param {List <T>} skipList 
 */
function transformErrors(errMap, skipList) {
 
  /**
  * Recurses through a collection, joining any List of Strings. 
  * @param {Collection <K, V>} el 
  */ 
  function deepJoin(el) {
    if (el.isEmpty()) {
      return el;
    } else if (el.every(idx => typeof idx === 'string')) {
      return el.join('.').concat('.');
    } else {
      return el.map(el => deepJoin(el))
    }
  }
  
  return errMap.map((val, key) => 
    skipList.includes(key) ? 
    val.map(el => deepJoin(el)) : 
    val.flatten().toSet().join('. ').concat('.'));
}

it('should tranform errors', () => {
  // example error object returned from API converted to Immutable.Map
  const errors = Immutable.fromJS({
    name: ['This field is required'],
    age: ['This field is required', 'Only numeric characters are allowed'],
    urls: [{}, {}, {
      site: {
        code: ['This site code is invalid'],
        id: ['Unsupported id'],
      }
    }],
    url: {
      site: {
        code: ['This site code is invalid'],
        id: ['Unsupported id'],
      }
    },
    tags: [{}, {
      non_field_errors: ['Only alphanumeric characters are allowed'],
      another_error: ['Only alphanumeric characters are allowed'],
      third_error: ['Third error']
    }, {}, {
      non_field_errors: [
        'Minumum length of 10 characters is required',
        'Only alphanumeric characters are allowed',
      ],
    }],
    tag: {
      nested: {
        non_field_errors: ['Only alphanumeric characters are allowed'],
      },
    },
  });

  // list of keys to keep nested
  const skipList = Immutable.fromJS(['url', 'urls']);

  // in this specific case,
  // errors for `url` and `urls` keys should be nested
  // see expected object below
  const result = transformErrors(errors, skipList);

  assert.deepEqual(result.toJS(), {
    name: 'This field is required.',
    age: 'This field is required. Only numeric characters are allowed.',
    urls: [{}, {}, {
      site: {
        code: 'This site code is invalid.',
        id: 'Unsupported id.',
      },
    }],
    url: {
      site: {
        code: 'This site code is invalid.',
        id: 'Unsupported id.',
      },
    },
    tags: 'Only alphanumeric characters are allowed. Third error. ' +
      'Minumum length of 10 characters is required.',
    tag: 'Only alphanumeric characters are allowed.',
  });
});