package com.assxmblxr.backend.repository;

import com.assxmblxr.backend.dto.FilterBlockDto;
import com.assxmblxr.backend.filter.GenericFilterParser;
import jakarta.persistence.*;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class GenericFilterRepository {

  private final EntityManager em;

  @SuppressWarnings("unchecked")
  public Page<Object> filter(Class<?> entityClass,
                             List<FilterBlockDto> blocks,
                             Pageable pageable) {
    CriteriaBuilder cb = em.getCriteriaBuilder();

    CriteriaQuery<Object> dataQ = (CriteriaQuery<Object>) cb.createQuery(entityClass);
    Root<?> dataRoot = dataQ.from(entityClass);
    Predicate dataPred = new GenericFilterParser(cb, dataQ, dataRoot).parse(blocks);
    dataQ.select((Selection<? extends Object>) dataRoot).where(dataPred);

    List<Object> rows = em.createQuery(dataQ)
            .setFirstResult((int) pageable.getOffset())
            .setMaxResults(pageable.getPageSize())
            .getResultList();

    CriteriaQuery<Long> countQ = cb.createQuery(Long.class);
    Root<?> countRoot = countQ.from(entityClass);
    Predicate countPred = new GenericFilterParser(cb, countQ, countRoot).parse(blocks);
    countQ.select(cb.countDistinct(countRoot)).where(countPred);
    Long total = em.createQuery(countQ).getSingleResult();

    return new PageImpl<>(rows, pageable, total);
  }
}